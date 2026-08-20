// find-arduino-port.cpp
// Uses Windows SetupAPI to find Arduino/CH340 serial ports by USB hardware ID
// Compile: cl /EHsc find-arduino-port.cpp setupapi.lib
// Output: JSON like {"port":"COM6","found":true} or {"found":false}

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <setupapi.h>
#include <devguid.h>
#include <cfgmgr32.h>
#include <stdio.h>
#include <string.h>

#pragma comment(lib, "setupapi.lib")

// Known Arduino/CH340 USB Vendor IDs
bool isArduinoVid(WORD vid) {
    return vid == 0x1A86 || vid == 0x2341 || vid == 0x239A
        || vid == 0x10C4 || vid == 0x0403 || vid == 0x2E8A
        || vid == 0x303A || vid == 0x1A86;  // CH340/CH341
}

int main(int argc, char* argv[]) {
    HDEVINFO deviceInfoSet = SetupDiGetClassDevsA(
        &GUID_DEVCLASS_PORTS,
        NULL,
        NULL,
        DIGCF_PRESENT
    );

    if (deviceInfoSet == INVALID_HANDLE_VALUE) {
        printf("{\"found\":false,\"error\":\"SetupDiGetClassDevs failed: %lu\"}\n", GetLastError());
        return 1;
    }

    SP_DEVINFO_DATA deviceInfoData;
    deviceInfoData.cbSize = sizeof(SP_DEVINFO_DATA);

    char foundPort[16] = {0};
    char foundDesc[256] = {0};

    for (DWORD i = 0; SetupDiEnumDeviceInfo(deviceInfoSet, i, &deviceInfoData); i++) {
        char hardwareId[512] = {0};
        char friendlyName[512] = {0};
        char portName[32] = {0};

        // Get hardware ID (contains VID/PID)
        SetupDiGetDeviceRegistryPropertyA(
            deviceInfoSet, &deviceInfoData,
            SPDRP_HARDWAREID, NULL,
            (PBYTE)hardwareId, sizeof(hardwareId), NULL
        );

        // Get friendly name (contains COM port)
        SetupDiGetDeviceRegistryPropertyA(
            deviceInfoSet, &deviceInfoData,
            SPDRP_FRIENDLYNAME, NULL,
            (PBYTE)friendlyName, sizeof(friendlyName), NULL
        );

        if (strlen(hardwareId) == 0) continue;

        // Check if this is an Arduino/CH340 device
        bool isTarget = false;
        char* hwUpper = hardwareId;
        for (char* p = hwUpper; *p; p++) *p = (char)toupper(*p);

        // Check for known VID patterns
        if (strstr(hwUpper, "VID_1A86") || strstr(hwUpper, "VID_2341") ||
            strstr(hwUpper, "VID_239A") || strstr(hwUpper, "VID_10C4") ||
            strstr(hwUpper, "VID_0403") || strstr(hwUpper, "VID_2E8A") ||
            strstr(hwUpper, "VID_303A")) {
            isTarget = true;
        }

        if (!isTarget) continue;

        // Extract COM port from friendly name (e.g., "USB Serial Port (COM6)")
        if (strlen(friendlyName) > 0) {
            char* comStart = strstr(friendlyName, "(COM");
            if (comStart) {
                comStart++;
                char* closeParen = strchr(comStart, ')');
                if (closeParen) {
                    size_t len = closeParen - comStart;
                    if (len < sizeof(portName)) {
                        strncpy(portName, comStart, len);
                        portName[len] = 0;
                    }
                }
            }
        }

        // Also try CM_Get_Device_ID for port name fallback
        if (strlen(portName) == 0) {
            DEVINST devInst = deviceInfoData.DevInst;
            char buf[256];
            if (CM_Get_Device_IDA(devInst, buf, sizeof(buf), 0) == CR_SUCCESS) {
                // CM_Get_Device_ID returns device instance path
                // Try to get port name from registry
                HKEY hKey = SetupDiOpenDevRegKey(deviceInfoSet, &deviceInfoData,
                    DICS_FLAG_GLOBAL, 0, DIREG_DEV, KEY_READ);
                if (hKey && hKey != INVALID_HANDLE_VALUE) {
                    char value[32];
                    DWORD valueSize = sizeof(value);
                    DWORD valueType = 0;
                    if (RegQueryValueExA(hKey, "PortName", NULL, &valueType,
                        (LPBYTE)value, &valueSize) == ERROR_SUCCESS && valueType == REG_SZ) {
                        strncpy(portName, value, sizeof(portName) - 1);
                    }
                    RegCloseKey(hKey);
                }
            }
        }

        if (strlen(portName) > 0) {
            strncpy(foundPort, portName, sizeof(foundPort) - 1);
            strncpy(foundDesc, friendlyName, sizeof(foundDesc) - 1);
            break;  // Take the first matching device
        }
    }

    SetupDiDestroyDeviceInfoList(deviceInfoSet);

    if (strlen(foundPort) > 0) {
        // Escape special chars in description for JSON
        printf("{\"port\":\"%s\",\"found\":true,\"description\":\"%s\"}\n", foundPort, foundDesc);
        return 0;
    } else {
        printf("{\"found\":false}\n");
        return 1;
    }
}
