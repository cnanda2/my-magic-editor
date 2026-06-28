import classNames from 'classnames';
import {connect} from 'react-redux';
import {compose} from 'redux';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import bowser from 'bowser';
import React from 'react';

import VM from 'scratch-vm';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import CommunityButton from './community-button.jsx';
import ShareButton from './share-button.jsx';
import {ComingSoonTooltip} from '../coming-soon/coming-soon.jsx';
import Divider from '../divider/divider.jsx';
import SaveStatus from './save-status.jsx';
import ProjectWatcher from '../../containers/project-watcher.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import MenuLabel from './tw-menu-label.jsx';
import {MenuItem, MenuSection} from '../menu/menu.jsx';
import ProjectTitleInput from './project-title-input.jsx';
import AuthorInfo from './author-info.jsx';
import SB3Downloader from '../../containers/sb3-downloader.jsx';
import DeletionRestorer from '../../containers/deletion-restorer.jsx';
import TurboMode from '../../containers/turbo-mode.jsx';
import MenuBarHOC from '../../containers/menu-bar-hoc.jsx';
import SettingsMenu from './settings-menu.jsx';

import FramerateChanger from '../../containers/tw-framerate-changer.jsx';
import ChangeUsername from '../../containers/tw-change-username.jsx';
import CloudVariablesToggler from '../../containers/tw-cloud-toggler.jsx';
import TWSaveStatus from './tw-save-status.jsx';
import TWNews from './tw-news.jsx';

import {openTipsLibrary, openSettingsModal, openRestorePointModal} from '../../reducers/modals';
import {setPlayer} from '../../reducers/mode';
import {
    isTimeTravel220022BC,
    isTimeTravel1920,
    isTimeTravel1990,
    isTimeTravel2020,
    isTimeTravelNow,
    setTimeTravel
} from '../../reducers/time-travel';
import {
    autoUpdateProject,
    getIsUpdating,
    getIsShowingProject,
    manualUpdateProject,
    requestNewProject,
    remixProject,
    saveProjectAsCopy
} from '../../reducers/project-state';
import {
    openAboutMenu,
    closeAboutMenu,
    aboutMenuOpen,
    openAccountMenu,
    closeAccountMenu,
    accountMenuOpen,
    openFileMenu,
    closeFileMenu,
    fileMenuOpen,
    openEditMenu,
    closeEditMenu,
    editMenuOpen,
    openLoginMenu,
    closeLoginMenu,
    loginMenuOpen,
    openModeMenu,
    closeModeMenu,
    modeMenuOpen,
    settingsMenuOpen,
    openSettingsMenu,
    closeSettingsMenu,
    errorsMenuOpen,
    openErrorsMenu,
    closeErrorsMenu
} from '../../reducers/menus';
import {setFileHandle} from '../../reducers/tw.js';

import collectMetadata from '../../lib/collect-metadata';

import styles from './menu-bar.css';

import helpIcon from '../../lib/assets/icon--tutorials.svg';
import mystuffIcon from './icon--mystuff.png';
import profileIcon from './icon--profile.png';
import remixIcon from './icon--remix.svg';
import dropdownCaret from './dropdown-caret.svg';
import aboutIcon from './icon--about.svg';
import fileIcon from './icon--file.svg';
import editIcon from './icon--edit.svg';
import addonsIcon from './addons.svg';
import errorIcon from './tw-error.svg';
import advancedIcon from './tw-advanced.svg';
import connectIcon from './icon--connect.svg';
import bluetoothIcon from './icon--bluetooth.svg';
import usbIcon from './icon--usb.svg';

import ninetiesLogo from './nineties_logo.svg';
import catLogo from './cat_logo.svg';
import prehistoricLogo from './prehistoric-logo.svg';
import oldtimeyLogo from './oldtimey-logo.svg';

import sharedMessages from '../../lib/shared-messages';

import SeeInsideButton from './tw-see-inside.jsx';
import {notScratchDesktop} from '../../lib/isScratchDesktop.js';
import {APP_NAME} from '../../lib/brand.js';

const HW_BOARDS = [
    {id: 'arduino_uno', name: 'Arduino Uno', file: 'arduino_uno'},
    {id: 'arduino_nano', name: 'Arduino Nano', file: 'arduino_nano'},
    {id: 'arduino_mega', name: 'Arduino Mega', file: 'arduino_mega'},
    {id: 'esp32', name: 'ESP32', file: 'esp32'}
];

const ariaMessages = defineMessages({
    tutorials: {
        id: 'gui.menuBar.tutorialsLibrary',
        defaultMessage: 'Tutorials',
        description: 'accessibility text for the tutorials button'
    }
});

const twMessages = defineMessages({
    compileError: {
        id: 'tw.menuBar.compileError',
        defaultMessage: '{sprite}: {error}',
        description: 'Error message in error menu'
    }
});

const MenuBarItemTooltip = ({
    children,
    className,
    enable,
    id,
    place = 'bottom'
}) => {
    if (enable) {
        return (
            <React.Fragment>
                {children}
            </React.Fragment>
        );
    }
    return (
        <ComingSoonTooltip
            className={classNames(styles.comingSoon, className)}
            place={place}
            tooltipClassName={styles.comingSoonTooltip}
            tooltipId={id}
        >
            {children}
        </ComingSoonTooltip>
    );
};


MenuBarItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    enable: PropTypes.bool,
    id: PropTypes.string,
    place: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

const MenuItemTooltip = ({id, isRtl, children, className}) => (
    <ComingSoonTooltip
        className={classNames(styles.comingSoon, className)}
        isRtl={isRtl}
        place={isRtl ? 'left' : 'right'}
        tooltipClassName={styles.comingSoonTooltip}
        tooltipId={id}
    >
        {children}
    </ComingSoonTooltip>
);

MenuItemTooltip.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    id: PropTypes.string,
    isRtl: PropTypes.bool
};

const AboutButton = props => (
    <Button
        className={classNames(styles.menuBarItem, styles.hoverable)}
        iconClassName={styles.aboutIcon}
        iconSrc={aboutIcon}
        onClick={props.onClick}
    />
);

AboutButton.propTypes = {
    onClick: PropTypes.func.isRequired
};

// Unlike <MenuItem href="">, this uses an actual <a>
const MenuItemLink = props => (
    <a
        href={props.href}
        rel="noreferrer"
        target="_blank"
        className={styles.menuItemLink}
    >
        <MenuItem>{props.children}</MenuItem>
    </a>
);

MenuItemLink.propTypes = {
    children: PropTypes.node.isRequired,
    href: PropTypes.string.isRequired
};

class MenuBar extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickSeeInside',
            'handleClickNew',
            'handleClickNewWindow',
            'handleClickRemix',
            'handleClickSave',
            'handleClickSaveAsCopy',
            'handleClickPackager',
            'handleClickDesktopSettings',
            'handleClickRestorePoints',
            'handleClickSeeCommunity',
            'handleClickShare',
            'handleSetMode',
            'handleKeyPress',
            'handleRestoreOption',
            'getSaveToComputerHandler',
            'restoreOptionMessage',
            'handleBoardOpen',
            'handleBoardClose',
            'handleBoardSelect',
            'handleConnectOpen',
            'handleConnectClose',
            'handleSerialClick',
            'handleBluetoothClick',
            'handleSerialClose',
            'handleBluetoothClose',
            'handleFetchPorts',
            'handleConnectPort',
            'handleDisconnect',
            'handleBoardWarningClose',
            'handleBoardWarningSelect',
            'handleConnWarningClose',
            'handleStageModeClick',
            'handleUploadModeClick'
        ]);
        this.state = {
            hwBoardOpen: false,
            hwConnectOpen: false,
            hwSerialOpen: false,
            hwBluetoothOpen: false,
            hwBoardWarningOpen: false,
            hwPorts: [],
            hwSelectedBoard: null,
            hwConnectedPort: null,
            hwConnecting: false,
            hwActiveMode: 'stage',
            hwConnWarningOpen: false
        };
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleKeyPress);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    handleClickNew () {
        // if the project is dirty, and user owns the project, we will autosave.
        // but if they are not logged in and can't save, user should consider
        // downloading or logging in first.
        // Note that if user is logged in and editing someone else's project,
        // they'll lose their work.
        const readyToReplaceProject = this.props.confirmReadyToReplaceProject(
            this.props.intl.formatMessage(sharedMessages.replaceProjectWarning)
        );
        this.props.onRequestCloseFile();
        if (readyToReplaceProject) {
            this.props.onClickNew(this.props.canSave && this.props.canCreateNew);
        }
        this.props.onRequestCloseFile();
    }
    handleClickNewWindow () {
        this.props.onClickNewWindow();
        this.props.onRequestCloseFile();
    }
    handleClickRemix () {
        this.props.onClickRemix();
        this.props.onRequestCloseFile();
    }
    handleClickSave () {
        this.props.onClickSave();
        this.props.onRequestCloseFile();
    }
    handleClickSaveAsCopy () {
        this.props.onClickSaveAsCopy();
        this.props.onRequestCloseFile();
    }
    handleClickPackager () {
        this.props.onClickPackager();
        this.props.onRequestCloseFile();
    }
    handleClickDesktopSettings () {
        this.props.onClickDesktopSettings();
        this.props.onRequestCloseSettings();
    }
    handleClickRestorePoints () {
        this.props.onClickRestorePoints();
        this.props.onRequestCloseFile();
    }
    handleClickSeeCommunity (waitForUpdate) {
        if (this.props.shouldSaveBeforeTransition()) {
            this.props.autoUpdateProject(); // save before transitioning to project page
            waitForUpdate(true); // queue the transition to project page
        } else {
            waitForUpdate(false); // immediately transition to project page
        }
    }
    handleClickShare (waitForUpdate) {
        if (!this.props.isShared) {
            if (this.props.canShare) { // save before transitioning to project page
                this.props.onShare();
            }
            if (this.props.canSave) { // save before transitioning to project page
                this.props.autoUpdateProject();
                waitForUpdate(true); // queue the transition to project page
            } else {
                waitForUpdate(false); // immediately transition to project page
            }
        }
    }
    handleSetMode (mode) {
        return () => {
            // Turn on/off filters for modes.
            if (mode === '1920') {
                document.documentElement.style.filter = 'brightness(.9)contrast(.8)sepia(1.0)';
                document.documentElement.style.height = '100%';
            } else if (mode === '1990') {
                document.documentElement.style.filter = 'hue-rotate(40deg)';
                document.documentElement.style.height = '100%';
            } else {
                document.documentElement.style.filter = '';
                document.documentElement.style.height = '';
            }

            // Change logo for modes
            if (mode === '1990') {
                document.getElementById('logo_img').src = ninetiesLogo;
            } else if (mode === '2020') {
                document.getElementById('logo_img').src = catLogo;
            } else if (mode === '1920') {
                document.getElementById('logo_img').src = oldtimeyLogo;
            } else if (mode === '220022BC') {
                document.getElementById('logo_img').src = prehistoricLogo;
            } else {
                document.getElementById('logo_img').src = this.props.logo;
            }

            this.props.onSetTimeTravelMode(mode);
        };
    }
    handleRestoreOption (restoreFun) {
        return () => {
            restoreFun();
            this.props.onRequestCloseEdit();
        };
    }
    handleKeyPress (event) {
        const modifier = bowser.mac ? event.metaKey : event.ctrlKey;
        if (modifier) {
            if (event.key.toLowerCase() === 's') {
                this.props.handleSaveProject();
                event.preventDefault();    
            } else if (event.key.toLowerCase() === 'o') {
                event.preventDefault();    
                this.props.onStartSelectingFileUpload();
            }
        }
    }
    getSaveToComputerHandler (downloadProjectCallback) {
        return () => {
            this.props.onRequestCloseFile();
            downloadProjectCallback();
            if (this.props.onProjectTelemetryEvent) {
                const metadata = collectMetadata(this.props.vm, this.props.projectTitle, this.props.locale);
                this.props.onProjectTelemetryEvent('projectDidSave', metadata);
            }
        };
    }
    restoreOptionMessage (deletedItem) {
        switch (deletedItem) {
        case 'Sprite':
            return (<FormattedMessage
                defaultMessage="Restore Sprite"
                description="Menu bar item for restoring the last deleted sprite."
                id="gui.menuBar.restoreSprite"
            />);
        case 'Sound':
            return (<FormattedMessage
                defaultMessage="Restore Sound"
                description="Menu bar item for restoring the last deleted sound."
                id="gui.menuBar.restoreSound"
            />);
        case 'Costume':
            return (<FormattedMessage
                defaultMessage="Restore Costume"
                description="Menu bar item for restoring the last deleted costume."
                id="gui.menuBar.restoreCostume"
            />);
        default: {
            return (<FormattedMessage
                defaultMessage="Restore"
                description="Menu bar item for restoring the last deleted item in its disabled state." /* eslint-disable-line max-len */
                id="gui.menuBar.restore"
            />);
        }
        }
    }
    handleClickSeeInside () {
        this.props.onClickSeeInside();
    }
    handleBoardOpen () {
        this.setState({hwBoardOpen: true, hwConnectOpen: false});
    }
    handleBoardClose () {
        this.setState({hwBoardOpen: false});
    }
    handleBoardSelect (board) {
        if (!window.__hardwareConnection?.port && !this.state.hwConnectedPort) {
            this.setState({hwConnWarningOpen: true});
            return;
        }
        this.setState({hwBoardOpen: false, hwSelectedBoard: board});
        const url = `${window.location.origin}/${board.file}.js`;
        this.props.vm.extensionManager.loadExtensionURL(url)
            .catch(err => alert(err)); // eslint-disable-line no-alert
    }
    handleConnectOpen () {
        this.setState({hwConnectOpen: true, hwBoardOpen: false});
    }
    handleConnectClose () {
        this.setState({hwConnectOpen: false});
    }
    handleSerialClick () {
        if (!this.state.hwSelectedBoard) {
            this.setState({hwConnectOpen: false, hwBoardWarningOpen: true});
            return;
        }
        this.setState({hwConnectOpen: false});
        if (navigator.serial) {
            navigator.serial.requestPort()
                .then(port => {
                    this.setState({hwSerialPort: port});
                    return port.open({baudRate: 115200});
                })
                .then(() => {
                    const port = this.state.hwSerialPort;
                    let portLabel = 'Web Serial';
                    try {
                        const info = port.getInfo ? port.getInfo() : {};
                        if (info && info.usbVendorId) portLabel = 'USB ' + info.usbVendorId.toString(16).toUpperCase();
                    } catch (_) {}
                    window.__hardwareConnection = window.__hardwareConnection || {};
                    window.__hardwareConnection.port = 'web-serial';
                    this.setState({hwConnectedPort: portLabel});
                })
                .catch(() => {});
        } else {
            alert('Web Serial API is not supported in this browser. Use Chrome or Edge.'); // eslint-disable-line no-alert
        }
    }
    handleBluetoothClick () {
        if (!this.state.hwSelectedBoard) {
            this.setState({hwConnectOpen: false, hwBoardWarningOpen: true});
            return;
        }
        this.setState({hwConnectOpen: false});
        if (navigator.bluetooth) {
            navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service', '0000ffe0-0000-1000-8000-00805f9b34fb']
            })
                .then(device => {
                    this.setState({hwBluetoothDevice: device, hwConnectedPort: device.name || 'Bluetooth'});
                    return device.gatt.connect();
                })
                .then(() => {})
                .catch(() => {});
        } else {
            alert('Web Bluetooth API is not supported in this browser. Use Chrome or Edge.'); // eslint-disable-line no-alert
        }
    }
    handleBoardWarningClose () {
        this.setState({hwBoardWarningOpen: false});
    }
    handleBoardWarningSelect () {
        this.setState({hwBoardWarningOpen: false, hwBoardOpen: true});
    }
    handleConnWarningClose () {
        this.setState({hwConnWarningOpen: false});
    }
    handleStageModeClick () {
        this.setState({hwActiveMode: 'stage'});
        window.dispatchEvent(new CustomEvent('hwModeChange', {detail: {mode: 'stage'}}));
    }
    handleUploadModeClick () {
        if (!this.state.hwSelectedBoard) {
            this.setState({hwBoardWarningOpen: true});
            return;
        }
        this.setState({hwActiveMode: 'upload'});
        window.dispatchEvent(new CustomEvent('hwModeChange', {detail: {
            mode: 'upload',
            board: this.state.hwSelectedBoard
        }}));
    }
    handleSerialClose () {
        this.setState({hwSerialOpen: false});
    }
    handleBluetoothClose () {
        this.setState({hwBluetoothOpen: false});
    }
    handleFetchPorts () {
        fetch('/api/serial/ports')
            .then(r => r.json())
            .then(data => this.setState({hwPorts: Array.isArray(data) ? data : (data.ports || [])}))
            .catch(() => this.setState({hwPorts: []}));
    }
    handleConnectPort (portPath) {
        this.setState({hwConnecting: true});
        window.__hardwareConnection = window.__hardwareConnection || {};
        window.__hardwareConnection.port = portPath;
        fetch('/api/serial/connect', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({port: portPath, baudRate: 115200})
        })
            .then(r => r.json())
            .then(() => this.setState({
                hwConnectedPort: portPath,
                hwSerialOpen: false,
                hwConnecting: false
            }))
            .catch(() => this.setState({
                hwConnectedPort: portPath,
                hwSerialOpen: false,
                hwConnecting: false
            }));
    }
    handleDisconnect () {
        if (this.state.hwSerialPort) {
            this.state.hwSerialPort.close()
                .catch(() => {});
        }
        if (window.__hardwareConnection) {
            window.__hardwareConnection.port = null;
        }
        this.setState({hwConnectedPort: null, hwSerialPort: null});
    }
    buildAboutMenu (onClickAbout) {
        if (!onClickAbout) {
            // hide the button
            return null;
        }
        if (typeof onClickAbout === 'function') {
            // make a button which calls a function
            return <AboutButton onClick={onClickAbout} />;
        }
        // assume it's an array of objects
        // each item must have a 'title' FormattedMessage and a 'handleClick' function
        // generate a menu with items for each object in the array
        return (
            <MenuLabel
                open={this.props.aboutMenuOpen}
                onOpen={this.props.onRequestOpenAbout}
                onClose={this.props.onRequestCloseAbout}
            >
                <img
                    className={styles.aboutIcon}
                    src={aboutIcon}
                    draggable={false}
                />
                <MenuBarMenu
                    className={classNames(styles.menuBarMenu)}
                    open={this.props.aboutMenuOpen}
                    place={this.props.isRtl ? 'right' : 'left'}
                >
                    {
                        onClickAbout.map(itemProps => (
                            <MenuItem
                                key={itemProps.title}
                                isRtl={this.props.isRtl}
                                onClick={this.wrapAboutMenuCallback(itemProps.onClick)}
                            >
                                {itemProps.title}
                            </MenuItem>
                        ))
                    }
                </MenuBarMenu>
            </MenuLabel>
        );
    }
    wrapAboutMenuCallback (callback) {
        return () => {
            callback();
            this.props.onRequestCloseAbout();
        };
    }
    render () {
        const saveNowMessage = (
            <FormattedMessage
                defaultMessage="Save now"
                description="Menu bar item for saving now"
                id="gui.menuBar.saveNow"
            />
        );
        const createCopyMessage = (
            <FormattedMessage
                defaultMessage="Save as a copy"
                description="Menu bar item for saving as a copy"
                id="gui.menuBar.saveAsCopy"
            />
        );
        const remixMessage = (
            <FormattedMessage
                defaultMessage="Remix"
                description="Menu bar item for remixing"
                id="gui.menuBar.remix"
            />
        );
        const newProjectMessage = (
            <FormattedMessage
                defaultMessage="New"
                description="Menu bar item for creating a new project"
                id="gui.menuBar.new"
            />
        );
        const remixButton = (
            <Button
                className={classNames(
                    styles.menuBarButton,
                    styles.remixButton
                )}
                iconClassName={styles.remixButtonIcon}
                iconSrc={remixIcon}
                onClick={this.handleClickRemix}
            >
                {remixMessage}
            </Button>
        );
        // Show the About button only if we have a handler for it (like in the desktop app)
        const aboutButton = this.buildAboutMenu(this.props.onClickAbout);
        const menuBar = (
            <Box
                className={classNames(
                    this.props.className,
                    styles.menuBar
                )}
            >
                <div className={styles.mainMenu}>
                    <div className={styles.fileGroup}>
                        {this.props.errors.length > 0 && <div>
                            <MenuLabel
                                open={this.props.errorsMenuOpen}
                                onOpen={this.props.onClickErrors}
                                onClose={this.props.onRequestCloseErrors}
                            >
                                <img
                                    src={errorIcon}
                                    draggable={false}
                                    width={20}
                                    height={20}
                                />
                                <img
                                    src={dropdownCaret}
                                    draggable={false}
                                    width={8}
                                    height={5}
                                />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.errorsMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuSection>
                                        <MenuItemLink href="https://scratch.mit.edu/users/GarboMuffin/#comments">
                                            <FormattedMessage
                                                defaultMessage="Some scripts encountered errors."
                                                description="Link in error menu"
                                                id="tw.menuBar.reportError1"
                                            />
                                        </MenuItemLink>
                                        <MenuItemLink href="https://scratch.mit.edu/users/GarboMuffin/#comments">
                                            <FormattedMessage
                                                defaultMessage="This is a bug. Please report it."
                                                description="Link in error menu"
                                                id="tw.menuBar.reportError2"
                                            />
                                        </MenuItemLink>
                                    </MenuSection>
                                    <MenuSection>
                                        {this.props.errors.map(({id, sprite, error}) => (
                                            <MenuItem key={id}>
                                                {this.props.intl.formatMessage(twMessages.compileError, {
                                                    sprite,
                                                    error
                                                })}
                                            </MenuItem>
                                        ))}
                                    </MenuSection>
                                </MenuBarMenu>
                            </MenuLabel>
                        </div>}
                        {(this.props.canChangeTheme || this.props.canChangeLanguage) && (<SettingsMenu
                            canChangeLanguage={this.props.canChangeLanguage}
                            canChangeTheme={this.props.canChangeTheme}
                            isRtl={this.props.isRtl}
                            onClickDesktopSettings={
                                this.props.onClickDesktopSettings &&
                                this.handleClickDesktopSettings
                            }
                            // eslint-disable-next-line react/jsx-no-bind
                            onOpenCustomSettings={
                                this.props.onClickAddonSettings &&
                                this.props.onClickAddonSettings.bind(null, 'editor-theme3')
                            }
                            onRequestClose={this.props.onRequestCloseSettings}
                            onRequestOpen={this.props.onClickSettings}
                            settingsMenuOpen={this.props.settingsMenuOpen}
                        />)}
                        {(this.props.canManageFiles) && (
                            <MenuLabel
                                open={this.props.fileMenuOpen}
                                onOpen={this.props.onClickFile}
                                onClose={this.props.onRequestCloseFile}
                            >
                                <img
                                    src={fileIcon}
                                    draggable={false}
                                    width={20}
                                    height={20}
                                />
                                <span className={styles.collapsibleLabel}>
                                    <FormattedMessage
                                        defaultMessage="File"
                                        description="Text for file dropdown menu"
                                        id="gui.menuBar.file"
                                    />
                                </span>
                                <img
                                    src={dropdownCaret}
                                    draggable={false}
                                    width={8}
                                    height={5}
                                />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.fileMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuItem
                                        isRtl={this.props.isRtl}
                                        onClick={this.handleClickNew}
                                    >
                                        {newProjectMessage}
                                    </MenuItem>
                                    {this.props.onClickNewWindow && (
                                        <MenuItem
                                            isRtl={this.props.isRtl}
                                            onClick={this.handleClickNewWindow}
                                        >
                                            <FormattedMessage
                                                defaultMessage="New window"
                                                // eslint-disable-next-line max-len
                                                description="Part of desktop app. Menu bar item that creates a new window."
                                                id="tw.menuBar.newWindow"
                                            />
                                        </MenuItem>
                                    )}
                                    {(this.props.canSave || this.props.canCreateCopy || this.props.canRemix) && (
                                        <MenuSection>
                                            {this.props.canSave && (
                                                <MenuItem onClick={this.handleClickSave}>
                                                    {saveNowMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canCreateCopy && (
                                                <MenuItem onClick={this.handleClickSaveAsCopy}>
                                                    {createCopyMessage}
                                                </MenuItem>
                                            )}
                                            {this.props.canRemix && (
                                                <MenuItem onClick={this.handleClickRemix}>
                                                    {remixMessage}
                                                </MenuItem>
                                            )}
                                        </MenuSection>
                                    )}
                                    <MenuSection>
                                        <MenuItem
                                            onClick={this.props.onStartSelectingFileUpload}
                                        >
                                            {this.props.intl.formatMessage(sharedMessages.loadFromComputerTitle)}
                                        </MenuItem>
                                        <SB3Downloader
                                            showSaveFilePicker={this.props.showSaveFilePicker}
                                        >
                                            {(_className, downloadProject, extended) => (
                                                <React.Fragment>
                                                    {extended.available && (
                                                        <React.Fragment>
                                                            {extended.name !== null && (
                                                                // eslint-disable-next-line max-len
                                                                <MenuItem onClick={this.getSaveToComputerHandler(extended.saveToLastFile)}>
                                                                    <FormattedMessage
                                                                        defaultMessage="Save to {file}"
                                                                        // eslint-disable-next-line max-len
                                                                        description="Menu bar item to save project to an existing file on the user's computer"
                                                                        id="tw.saveTo"
                                                                        values={{
                                                                            file: extended.name
                                                                        }}
                                                                    />
                                                                </MenuItem>
                                                            )}
                                                            {/* eslint-disable-next-line max-len */}
                                                            <MenuItem onClick={this.getSaveToComputerHandler(extended.saveAsNew)}>
                                                                <FormattedMessage
                                                                    defaultMessage="Save as..."
                                                                    // eslint-disable-next-line max-len
                                                                    description="Menu bar item to select a new file to save the project as"
                                                                    id="tw.saveAs"
                                                                />
                                                            </MenuItem>
                                                        </React.Fragment>
                                                    )}
                                                    {notScratchDesktop() && (
                                                        <MenuItem
                                                            onClick={this.getSaveToComputerHandler(downloadProject)}
                                                        >
                                                            {extended.available ? (
                                                                <FormattedMessage
                                                                    defaultMessage="Save to separate file..."
                                                                    // eslint-disable-next-line max-len
                                                                    description="Download the project once, without being able to easily save to the same spot"
                                                                    id="tw.oldDownload"
                                                                />
                                                            ) : (
                                                                <FormattedMessage
                                                                    defaultMessage="Save to your computer"
                                                                    description="Menu bar item for downloading a project to your computer" // eslint-disable-line max-len
                                                                    id="gui.menuBar.downloadToComputer"
                                                                />
                                                            )}
                                                        </MenuItem>
                                                    )}
                                                </React.Fragment>
                                            )}
                                        </SB3Downloader>
                                    </MenuSection>
                                    {this.props.onClickPackager && (
                                        <MenuSection>
                                            <MenuItem
                                                onClick={this.handleClickPackager}
                                            >
                                                <FormattedMessage
                                                    defaultMessage="Package project"
                                                    // eslint-disable-next-line max-len
                                                    description="Menu bar item to open the current project in the packager"
                                                    id="tw.menuBar.package"
                                                />
                                            </MenuItem>
                                        </MenuSection>
                                    )}
                                    <MenuSection>
                                        <MenuItem onClick={this.handleClickRestorePoints}>
                                            <FormattedMessage
                                                defaultMessage="Restore points"
                                                description="Menu bar item to manage restore points"
                                                id="tw.menuBar.restorePoints"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </MenuLabel>
                        )}
                        <MenuLabel
                            open={this.props.editMenuOpen}
                            onOpen={this.props.onClickEdit}
                            onClose={this.props.onRequestCloseEdit}
                        >
                            <img
                                src={editIcon}
                                draggable={false}
                                width={20}
                                height={20}
                            />
                            <span className={styles.collapsibleLabel}>
                                <FormattedMessage
                                    defaultMessage="Edit"
                                    description="Text for edit dropdown menu"
                                    id="gui.menuBar.edit"
                                />
                            </span>
                            <img
                                src={dropdownCaret}
                                draggable={false}
                                width={8}
                                height={5}
                            />
                            <MenuBarMenu
                                className={classNames(styles.menuBarMenu)}
                                open={this.props.editMenuOpen}
                                place={this.props.isRtl ? 'left' : 'right'}
                            >
                                {this.props.isPlayerOnly ? null : (
                                    <DeletionRestorer>{(handleRestore, {restorable, deletedItem}) => (
                                        <MenuItem
                                            className={classNames({[styles.disabled]: !restorable})}
                                            onClick={this.handleRestoreOption(handleRestore)}
                                        >
                                            {this.restoreOptionMessage(deletedItem)}
                                        </MenuItem>
                                    )}</DeletionRestorer>
                                )}
                                <MenuSection>
                                    <TurboMode>{(toggleTurboMode, {turboMode}) => (
                                        <MenuItem onClick={toggleTurboMode}>
                                            {turboMode ? (
                                                <FormattedMessage
                                                    defaultMessage="Turn off Turbo Mode"
                                                    description="Menu bar item for turning off turbo mode"
                                                    id="gui.menuBar.turboModeOff"
                                                />
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Turn on Turbo Mode"
                                                    description="Menu bar item for turning on turbo mode"
                                                    id="gui.menuBar.turboModeOn"
                                                />
                                            )}
                                        </MenuItem>
                                    )}</TurboMode>
                                    <FramerateChanger>{(changeFramerate, {framerate}) => (
                                        <MenuItem onClick={changeFramerate}>
                                            {framerate === 60 ? (
                                                <FormattedMessage
                                                    defaultMessage="Turn off 60 FPS Mode"
                                                    description="Menu bar item for turning off 60 FPS mode"
                                                    id="tw.menuBar.60off"
                                                />
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Turn on 60 FPS Mode"
                                                    description="Menu bar item for turning on 60 FPS mode"
                                                    id="tw.menuBar.60on"
                                                />
                                            )}
                                        </MenuItem>
                                    )}</FramerateChanger>
                                    <ChangeUsername>{changeUsername => (
                                        <MenuItem onClick={changeUsername}>
                                            <FormattedMessage
                                                defaultMessage="Change Username"
                                                description="Menu bar item for changing the username"
                                                id="tw.menuBar.changeUsername"
                                            />
                                        </MenuItem>
                                    )}</ChangeUsername>
                                    <CloudVariablesToggler>{(toggleCloudVariables, {enabled, canUseCloudVariables}) => (
                                        <MenuItem
                                            className={classNames({[styles.disabled]: !canUseCloudVariables})}
                                            onClick={toggleCloudVariables}
                                        >
                                            {canUseCloudVariables ? (
                                                enabled ? (
                                                    <FormattedMessage
                                                        defaultMessage="Disable Cloud Variables"
                                                        description="Menu bar item for disabling cloud variables"
                                                        id="tw.menuBar.cloudOff"
                                                    />
                                                ) : (
                                                    <FormattedMessage
                                                        defaultMessage="Enable Cloud Variables"
                                                        description="Menu bar item for enabling cloud variables"
                                                        id="tw.menuBar.cloudOn"
                                                    />
                                                )
                                            ) : (
                                                <FormattedMessage
                                                    defaultMessage="Cloud Variables are not Available"
                                                    // eslint-disable-next-line max-len
                                                    description="Menu bar item for when cloud variables are not available"
                                                    id="tw.menuBar.cloudUnavailable"
                                                />
                                            )}
                                        </MenuItem>
                                    )}</CloudVariablesToggler>
                                </MenuSection>
                                <MenuSection>
                                    <MenuItem onClick={this.props.onClickSettingsModal}>
                                        <FormattedMessage
                                            defaultMessage="Advanced Settings"
                                            description="Menu bar item for advanced settings"
                                            id="tw.menuBar.moreSettings"
                                        />
                                    </MenuItem>
                                </MenuSection>
                            </MenuBarMenu>
                        </MenuLabel>

                        {/* Board menu */}
                        <div className={classNames(styles.menuBarItem, styles.hoverable, styles.hwBoardMenu)}>
                            <div
                                className={styles.hwMenuTrigger}
                                onClick={this.handleBoardOpen}
                            >
                                <span className={styles.collapsibleLabel}>{'Board'}</span>
                                <img
                                    src={dropdownCaret}
                                    draggable={false}
                                    width={8}
                                    height={5}
                                />
                            </div>
                            {this.state.hwBoardOpen && (
                                <React.Fragment>
                                    <div
                                        className={styles.hwModalBackdrop}
                                        onClick={this.handleBoardClose}
                                    />
                                    <div className={styles.hwBoardModal}>
                                        <div className={styles.hwBoardModalHeader}>
                                            <span>{'Select Board'}</span>
                                            <button
                                                className={styles.hwModalCloseBtn}
                                                onClick={this.handleBoardClose}
                                            >
                                                {'✕'}
                                            </button>
                                        </div>
                                        <div className={styles.hwBoardGrid}>
                                            {HW_BOARDS.map(board => (
                                                <div
                                                    key={board.id}
                                                    className={styles.hwBoardTile}
                                                    // eslint-disable-next-line react/jsx-no-bind
                                                    onClick={() => this.handleBoardSelect(board)}
                                                >
                                                    <img
                                                        src={`/static/extensions/${board.id}/${board.id}-small.svg`}
                                                        className={styles.hwBoardImg}
                                                        draggable={false}
                                                    />
                                                    <div className={styles.hwBoardName}>{board.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}
                        </div>

                        {/* Connect menu */}
                        <div className={classNames(styles.menuBarItem, styles.hoverable, styles.hwConnectMenu)}>
                            <div
                                className={styles.hwMenuTrigger}
                                onClick={this.handleConnectOpen}
                            >
                                <img
                                    src={connectIcon}
                                    draggable={false}
                                    width={20}
                                    height={20}
                                />
                                {this.state.hwConnectedPort && (
                                    <span className={styles.hwStatusDot} />
                                )}
                                <span className={styles.collapsibleLabel}>{'Connect'}</span>
                                <img
                                    src={dropdownCaret}
                                    draggable={false}
                                    width={8}
                                    height={5}
                                />
                            </div>
                            {this.state.hwConnectOpen && (
                                <React.Fragment>
                                    <div
                                        className={styles.hwBackdrop}
                                        onClick={this.handleConnectClose}
                                    />
                                    <div className={styles.hwConnectDropdown}>
                                        {this.state.hwConnectedPort && (
                                            <div className={styles.hwConnectStatus}>
                                                <span className={styles.hwStatusDotGreen} />
                                                <span>{typeof this.state.hwConnectedPort === 'string' ? this.state.hwConnectedPort : String(this.state.hwConnectedPort)}</span>
                                                <button
                                                    className={styles.hwDisconnectBtn}
                                                    onClick={this.handleDisconnect}
                                                >
                                                    {'Disconnect'}
                                                </button>
                                            </div>
                                        )}
                                        <div
                                            className={styles.hwConnectItem}
                                            onClick={this.handleSerialClick}
                                        >
                                            <img
                                                src={usbIcon}
                                                draggable={false}
                                                width={16}
                                                height={16}
                                            />
                                            {'Serial'}
                                        </div>
                                        <div
                                            className={styles.hwConnectItem}
                                            onClick={this.handleBluetoothClick}
                                        >
                                            <img
                                                src={bluetoothIcon}
                                                draggable={false}
                                                width={16}
                                                height={16}
                                            />
                                            {'Bluetooth'}
                                        </div>
                                    </div>
                                </React.Fragment>
                            )}
                        </div>

                        {/* Serial uses browser native Web Serial API dialog */}

                        {/* Bluetooth uses browser native Web Bluetooth API dialog */}

                        {/* Board not selected warning popup */}
                        {this.state.hwBoardWarningOpen && (
                            <React.Fragment>
                                <div
                                    className={styles.hwModalBackdrop}
                                    onClick={this.handleBoardWarningClose}
                                />
                                <div className={styles.hwWarningModal}>
                                    <div className={styles.hwWarningHeader}>
                                        <span>{'Warning!'}</span>
                                        <button
                                            className={styles.hwWarningCloseBtn}
                                            onClick={this.handleBoardWarningClose}
                                        >
                                            {'✕'}
                                        </button>
                                    </div>
                                    <div className={styles.hwWarningBody}>
                                        <svg
                                            className={styles.hwWarningIcon}
                                            viewBox="0 0 80 80"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <rect x="20" y="15" width="40" height="50" rx="3"
                                                fill="none" stroke="#999" strokeWidth="2.5"
                                            />
                                            <rect x="32" y="27" width="16" height="16" rx="2"
                                                fill="none" stroke="#999" strokeWidth="2"
                                            />
                                            <text x="40" y="40" textAnchor="middle"
                                                dominantBaseline="middle"
                                                fill="#999" fontSize="14" fontWeight="bold"
                                            >{'?'}</text>
                                            <line x1="14" y1="30" x2="20" y2="30"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                            <line x1="14" y1="40" x2="20" y2="40"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                            <line x1="14" y1="50" x2="20" y2="50"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                            <line x1="60" y1="30" x2="66" y2="30"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                            <line x1="60" y1="40" x2="66" y2="40"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                            <line x1="60" y1="50" x2="66" y2="50"
                                                stroke="#999" strokeWidth="2.5"
                                            />
                                        </svg>
                                        <p className={styles.hwWarningText}>
                                            {'Please select the board first.'}
                                        </p>
                                    </div>
                                    <div className={styles.hwWarningFooter}>
                                        <button
                                            className={styles.hwSelectBoardBtn}
                                            onClick={this.handleBoardWarningSelect}
                                        >
                                            {'Select a board'}
                                        </button>
                                    </div>
                                </div>
                            </React.Fragment>
                        )}

                        {/* Connection warning modal */}
                        {this.state.hwConnWarningOpen && (
                            <React.Fragment>
                                <div
                                    className={styles.hwModalBackdrop}
                                    onClick={this.handleConnWarningClose}
                                />
                                <div className={styles.hwWarningModal}>
                                    <div className={styles.hwWarningHeader}>
                                        <span>{'Connect Your Board'}</span>
                                        <button
                                            className={styles.hwWarningCloseBtn}
                                            onClick={this.handleConnWarningClose}
                                        >
                                            {'✕'}
                                        </button>
                                    </div>
                                    <div className={styles.hwWarningBody}>
                                        <p className={styles.hwWarningText}>
                                            {'Please connect your Arduino board first. Click the Connect menu and select Serial or Bluetooth.'}
                                        </p>
                                    </div>
                                    <div className={styles.hwWarningFooter}>
                                        <button
                                            className={styles.hwSelectBoardBtn}
                                            onClick={this.handleConnWarningClose}
                                        >
                                            {'OK'}
                                        </button>
                                    </div>
                                </div>
                            </React.Fragment>
                        )}

                        {this.props.isTotallyNormal && (
                            <MenuLabel
                                open={this.props.modeMenuOpen}
                                onOpen={this.props.onClickMode}
                                onClose={this.props.onRequestCloseMode}
                            >
                                <FormattedMessage
                                    defaultMessage="Mode"
                                    description="Mode menu item in the menu bar"
                                    id="gui.menuBar.modeMenu"
                                />
                                <MenuBarMenu
                                    className={classNames(styles.menuBarMenu)}
                                    open={this.props.modeMenuOpen}
                                    place={this.props.isRtl ? 'left' : 'right'}
                                >
                                    <MenuSection>
                                        <MenuItem onClick={this.handleSetMode('NOW')}>
                                            <span className={classNames({[styles.inactive]: !this.props.modeNow})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Normal mode"
                                                description="April fools: resets editor to not have any pranks"
                                                id="gui.menuBar.normalMode"
                                            />
                                        </MenuItem>
                                        <MenuItem onClick={this.handleSetMode('2020')}>
                                            <span className={classNames({[styles.inactive]: !this.props.mode2020})}>
                                                {'✓'}
                                            </span>
                                            {' '}
                                            <FormattedMessage
                                                defaultMessage="Caturday mode"
                                                description="April fools: Cat blocks mode"
                                                id="gui.menuBar.caturdayMode"
                                            />
                                        </MenuItem>
                                    </MenuSection>
                                </MenuBarMenu>
                            </MenuLabel>
                        )}

                        {/* Addons and Advanced hidden */}
                    </div>

                    <Divider className={styles.divider} />

                    {this.props.canEditTitle ? (
                        <div className={classNames(styles.menuBarItem, styles.growable)}>
                            <MenuBarItemTooltip
                                enable
                                id="title-field"
                            >
                                <ProjectTitleInput
                                    className={classNames(styles.titleFieldGrowable)}
                                />
                            </MenuBarItemTooltip>
                        </div>
                    ) : ((this.props.authorUsername && this.props.authorUsername !== this.props.username) ? (
                        <AuthorInfo
                            className={styles.authorInfo}
                            imageUrl={this.props.authorThumbnailUrl}
                            projectId={this.props.projectId}
                            projectTitle={this.props.projectTitle}
                            userId={this.props.authorId}
                            username={this.props.authorUsername}
                        />
                    ) : null)}
                    {this.props.canShare ? (
                        (this.props.isShowingProject || this.props.isUpdating) && (
                            <div className={classNames(styles.menuBarItem)}>
                                <ProjectWatcher onDoneUpdating={this.props.onSeeCommunity}>
                                    {
                                        waitForUpdate => (
                                            <ShareButton
                                                className={styles.menuBarButton}
                                                isShared={this.props.isShared}
                                                /* eslint-disable react/jsx-no-bind */
                                                onClick={() => {
                                                    this.handleClickShare(waitForUpdate);
                                                }}
                                                /* eslint-enable react/jsx-no-bind */
                                            />
                                        )
                                    }
                                </ProjectWatcher>
                            </div>
                        )
                    ) : this.props.showComingSoon ? (
                        <div className={classNames(styles.menuBarItem)}>
                            <MenuBarItemTooltip id="share-button">
                                <ShareButton className={styles.menuBarButton} />
                            </MenuBarItemTooltip>
                        </div>
                    ) : null}
                    {this.props.canRemix && (
                        <div className={classNames(styles.menuBarItem)}>
                            {remixButton}
                        </div>
                    )}
                    <div className={classNames(styles.menuBarItem, styles.communityButtonWrapper)}>
                        {this.props.enableCommunity ? (
                            (this.props.isShowingProject || this.props.isUpdating) && (
                                <ProjectWatcher onDoneUpdating={this.props.onSeeCommunity}>
                                    {
                                        waitForUpdate => (
                                            <CommunityButton
                                                className={styles.menuBarButton}
                                                /* eslint-disable react/jsx-no-bind */
                                                onClick={() => {
                                                    this.handleClickSeeCommunity(waitForUpdate);
                                                }}
                                                /* eslint-enable react/jsx-no-bind */
                                            />
                                        )
                                    }
                                </ProjectWatcher>
                            )
                        ) : (this.props.showComingSoon ? (
                            <MenuBarItemTooltip id="community-button">
                                <CommunityButton className={styles.menuBarButton} />
                            </MenuBarItemTooltip>
                        ) : (this.props.enableSeeInside ? (
                            <SeeInsideButton
                                className={styles.menuBarButton}
                                onClick={this.handleClickSeeInside}
                            />
                        ) : []))}
                    </div>
                    {/* Mode label + Stage / Upload toggle buttons */}
                    <div className={styles.hwModeSwitcher}>
                        <span className={styles.hwModeLabel}>{'Mode'}</span>
                        <button
                            className={classNames(
                                styles.hwModeSwitchBtn,
                                {[styles.hwModeSwitchBtnActive]: this.state.hwActiveMode === 'stage'}
                            )}
                            onClick={this.handleStageModeClick}
                        >
                            {'Stage'}
                        </button>
                        <button
                            className={classNames(
                                styles.hwModeSwitchBtn,
                                {[styles.hwModeSwitchBtnActive]: this.state.hwActiveMode === 'upload'}
                            )}
                            onClick={this.handleUploadModeClick}
                        >
                            {'Upload'}
                        </button>
                    </div>

                    {/* tw: add a feedback button */}
                    <div className={styles.menuBarItem}>
                        <a
                            className={styles.feedbackLink}
                            href="https://scratch.mit.edu/users/GarboMuffin/#comments"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {/* todo: icon */}
                            <Button className={styles.feedbackButton}>
                                <FormattedMessage
                                    defaultMessage="{APP_NAME} Feedback"
                                    description="Button to give feedback in the menu bar"
                                    id="tw.feedbackButton"
                                    values={{
                                        APP_NAME
                                    }}
                                />
                            </Button>
                        </a>
                    </div>
                </div>

                <div className={styles.accountInfoGroup}>
                    <TWSaveStatus
                        showSaveFilePicker={this.props.showSaveFilePicker}
                    />
                </div>

                {aboutButton}
            </Box>
        );

        return (
            <React.Fragment>
                {menuBar}
                <TWNews />
            </React.Fragment>
        );
    }
}

MenuBar.propTypes = {
    enableSeeInside: PropTypes.bool,
    onClickSeeInside: PropTypes.func,
    aboutMenuOpen: PropTypes.bool,
    accountMenuOpen: PropTypes.bool,
    authorId: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    authorThumbnailUrl: PropTypes.string,
    authorUsername: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    autoUpdateProject: PropTypes.func,
    canChangeLanguage: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    canCreateCopy: PropTypes.bool,
    canCreateNew: PropTypes.bool,
    canEditTitle: PropTypes.bool,
    canManageFiles: PropTypes.bool,
    canRemix: PropTypes.bool,
    canSave: PropTypes.bool,
    canShare: PropTypes.bool,
    className: PropTypes.string,
    errors: PropTypes.arrayOf(PropTypes.shape({
        sprite: PropTypes.string,
        error: PropTypes.string,
        id: PropTypes.number
    })),
    errorsMenuOpen: PropTypes.bool,
    onClickErrors: PropTypes.func,
    onRequestCloseErrors: PropTypes.func,
    confirmReadyToReplaceProject: PropTypes.func,
    currentLocale: PropTypes.string.isRequired,
    editMenuOpen: PropTypes.bool,
    enableCommunity: PropTypes.bool,
    fileMenuOpen: PropTypes.bool,
    handleSaveProject: PropTypes.func,
    intl: intlShape,
    isPlayerOnly: PropTypes.bool,
    isRtl: PropTypes.bool,
    isShared: PropTypes.bool,
    isShowingProject: PropTypes.bool,
    isTotallyNormal: PropTypes.bool,
    isUpdating: PropTypes.bool,
    locale: PropTypes.string.isRequired,
    loginMenuOpen: PropTypes.bool,
    mode1920: PropTypes.bool,
    mode1990: PropTypes.bool,
    mode2020: PropTypes.bool,
    mode220022BC: PropTypes.bool,
    modeMenuOpen: PropTypes.bool,
    modeNow: PropTypes.bool,
    onClickAbout: PropTypes.oneOfType([
        PropTypes.func, // button mode: call this callback when the About button is clicked
        PropTypes.arrayOf( // menu mode: list of items in the About menu
            PropTypes.shape({
                title: PropTypes.string, // text for the menu item
                onClick: PropTypes.func // call this callback when the menu item is clicked
            })
        )
    ]),
    onClickAccount: PropTypes.func,
    onClickAddonSettings: PropTypes.func,
    onClickDesktopSettings: PropTypes.func,
    onClickPackager: PropTypes.func,
    onClickRestorePoints: PropTypes.func,
    onClickEdit: PropTypes.func,
    onClickFile: PropTypes.func,
    onClickLogin: PropTypes.func,
    onClickMode: PropTypes.func,
    onClickNew: PropTypes.func,
    onClickNewWindow: PropTypes.func,
    onClickRemix: PropTypes.func,
    onClickSave: PropTypes.func,
    onClickSaveAsCopy: PropTypes.func,
    onClickSettings: PropTypes.func,
    onClickSettingsModal: PropTypes.func,
    onLogOut: PropTypes.func,
    onOpenRegistration: PropTypes.func,
    onOpenTipLibrary: PropTypes.func,
    onProjectTelemetryEvent: PropTypes.func,
    onRequestCloseAbout: PropTypes.func,
    onRequestCloseAccount: PropTypes.func,
    onRequestCloseEdit: PropTypes.func,
    onRequestCloseFile: PropTypes.func,
    onRequestCloseLogin: PropTypes.func,
    onRequestCloseMode: PropTypes.func,
    onRequestCloseSettings: PropTypes.func,
    onRequestOpenAbout: PropTypes.func,
    onSeeCommunity: PropTypes.func,
    onSetTimeTravelMode: PropTypes.func,
    onShare: PropTypes.func,
    onStartSelectingFileUpload: PropTypes.func,
    onToggleLoginOpen: PropTypes.func,
    projectId: PropTypes.string,
    projectTitle: PropTypes.string,
    renderLogin: PropTypes.func,
    sessionExists: PropTypes.bool,
    settingsMenuOpen: PropTypes.bool,
    shouldSaveBeforeTransition: PropTypes.func,
    showSaveFilePicker: PropTypes.func,
    showComingSoon: PropTypes.bool,
    username: PropTypes.string,
    userOwnsProject: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

MenuBar.defaultProps = {
    onShare: () => {}
};

const mapStateToProps = (state, ownProps) => {
    const loadingState = state.scratchGui.projectState.loadingState;
    const user = state.session && state.session.session && state.session.session.user;
    return {
        authorUsername: state.scratchGui.tw.author.username,
        authorThumbnailUrl: state.scratchGui.tw.author.thumbnail,
        projectId: state.scratchGui.projectState.projectId,
        aboutMenuOpen: aboutMenuOpen(state),
        accountMenuOpen: accountMenuOpen(state),
        currentLocale: state.locales.locale,
        fileMenuOpen: fileMenuOpen(state),
        editMenuOpen: editMenuOpen(state),
        errors: state.scratchGui.tw.compileErrors,
        errorsMenuOpen: errorsMenuOpen(state),
        isPlayerOnly: state.scratchGui.mode.isPlayerOnly,
        isRtl: state.locales.isRtl,
        isUpdating: getIsUpdating(loadingState),
        isShowingProject: getIsShowingProject(loadingState),
        locale: state.locales.locale,
        loginMenuOpen: loginMenuOpen(state),
        modeMenuOpen: modeMenuOpen(state),
        projectTitle: state.scratchGui.projectTitle,
        sessionExists: state.session && typeof state.session.session !== 'undefined',
        settingsMenuOpen: settingsMenuOpen(state),
        username: user ? user.username : null,
        userOwnsProject: ownProps.authorUsername && user &&
            (ownProps.authorUsername === user.username),
        vm: state.scratchGui.vm,
        mode220022BC: isTimeTravel220022BC(state),
        mode1920: isTimeTravel1920(state),
        mode1990: isTimeTravel1990(state),
        mode2020: isTimeTravel2020(state),
        modeNow: isTimeTravelNow(state)
    };
};

const mapDispatchToProps = dispatch => ({
    onClickSeeInside: () => dispatch(setPlayer(false)),
    autoUpdateProject: () => dispatch(autoUpdateProject()),
    onOpenTipLibrary: () => dispatch(openTipsLibrary()),
    onClickAccount: () => dispatch(openAccountMenu()),
    onRequestCloseAccount: () => dispatch(closeAccountMenu()),
    onClickFile: () => dispatch(openFileMenu()),
    onRequestCloseFile: () => dispatch(closeFileMenu()),
    onClickEdit: () => dispatch(openEditMenu()),
    onRequestCloseEdit: () => dispatch(closeEditMenu()),
    onClickErrors: () => dispatch(openErrorsMenu()),
    onRequestCloseErrors: () => dispatch(closeErrorsMenu()),
    onClickLogin: () => dispatch(openLoginMenu()),
    onRequestCloseLogin: () => dispatch(closeLoginMenu()),
    onClickMode: () => dispatch(openModeMenu()),
    onRequestCloseMode: () => dispatch(closeModeMenu()),
    onRequestOpenAbout: () => dispatch(openAboutMenu()),
    onRequestCloseAbout: () => dispatch(closeAboutMenu()),
    onClickRestorePoints: () => dispatch(openRestorePointModal()),
    onClickSettings: () => dispatch(openSettingsMenu()),
    onClickSettingsModal: () => {
        dispatch(closeEditMenu());
        dispatch(openSettingsModal());
    },
    onRequestCloseSettings: () => dispatch(closeSettingsMenu()),
    onClickNew: needSave => {
        dispatch(requestNewProject(needSave));
        dispatch(setFileHandle(null));
    },
    onClickRemix: () => dispatch(remixProject()),
    onClickSave: () => dispatch(manualUpdateProject()),
    onClickSaveAsCopy: () => dispatch(saveProjectAsCopy()),
    onSeeCommunity: () => dispatch(setPlayer(true)),
    onSetTimeTravelMode: mode => dispatch(setTimeTravel(mode))
});

export default compose(
    injectIntl,
    MenuBarHOC,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(MenuBar);
