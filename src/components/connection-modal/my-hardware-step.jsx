import {FormattedMessage} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import Box from '../box/box.jsx';
import Dots from './dots.jsx';

import usbIcon from './icons/searching.png';
import bluetoothIcon from './icons/bluetooth.svg';
import connectIcon from './icons/refresh.svg';

import styles from './connection-modal.css';

const MyHardwareStep = props => {
    const isUSB = props.connectionType === 'usb';
    const isBluetooth = props.connectionType === 'bluetooth';
    return (
        <Box className={styles.body}>

            <Box className={styles.activityArea}>
                <div className={styles.activityAreaInfo}>

                    {/* Step 1 */}
                    <div className={classNames(styles.centeredRow, styles.myHardwareStep)}>
                        <div className={styles.myHardwareStepNumber}>
                            {'1'}
                        </div>
                        <img
                            className={styles.myHardwareStepIcon}
                            src={isBluetooth ? bluetoothIcon : usbIcon}
                            draggable={false}
                        />
                        <div className={styles.myHardwareStepText}>
                            {isUSB && (
                                <FormattedMessage
                                    defaultMessage="Plug your hardware device into a USB port on your computer."
                                    description="My Hardware connection step 1"
                                    id="gui.extension.myhardware.step1"
                                />
                            )}
                            {isBluetooth && (
                                <FormattedMessage
                                    defaultMessage="Turn on Bluetooth on your device and computer."
                                    description="My Hardware Bluetooth step 1"
                                    id="gui.extension.myhardware.bluetooth.step1"
                                />
                            )}
                            {!isUSB && !isBluetooth && (
                                <FormattedMessage
                                    defaultMessage="Plug your hardware device into a USB port or turn on Bluetooth."
                                    description="My Hardware connection step 1"
                                    id="gui.extension.myhardware.generic.step1"
                                />
                            )}
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={classNames(styles.centeredRow, styles.myHardwareStep)}>
                        <div className={styles.myHardwareStepNumber}>
                            {'2'}
                        </div>
                        <img
                            className={styles.myHardwareStepIcon}
                            src={connectIcon}
                            draggable={false}
                        />
                        <div className={styles.myHardwareStepText}>
                            <FormattedMessage
                                defaultMessage="Click Connect below. When the browser popup appears, select your device and click Connect."
                                description="My Hardware connection step 2"
                                id="gui.extension.myhardware.step2"
                            />
                        </div>
                    </div>

                </div>
            </Box>

            <Box className={styles.bottomArea}>
                <Box className={classNames(styles.bottomAreaItem, styles.instructions)}>
                    <FormattedMessage
                        defaultMessage="Make sure your device is powered on before connecting."
                        description="My Hardware connection instructions"
                        id="gui.extension.myhardware.instructions"
                    />
                </Box>

                <Dots
                    className={styles.bottomAreaItem}
                    counter={0}
                    total={3}
                />

                <Box className={classNames(styles.bottomAreaItem, styles.buttonRow)}>
                    <button
                        className={styles.connectionButton}
                        onClick={props.onConnectClick}
                    >
                        <FormattedMessage
                            defaultMessage="Connect"
                            description="Button to connect My Hardware via Web Serial"
                            id="gui.extension.myhardware.connectButton"
                        />
                        <img
                            className={styles.buttonIconRight}
                            src={connectIcon}
                            draggable={false}
                        />
                    </button>
                </Box>
            </Box>

        </Box>
    );
};

MyHardwareStep.propTypes = {
    onConnectClick: PropTypes.func.isRequired,
    connectionType: PropTypes.string
};

MyHardwareStep.defaultProps = {
    connectionType: null
};

export default MyHardwareStep;