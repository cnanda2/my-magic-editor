import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ScanningStepComponent from '../components/connection-modal/scanning-step.jsx';
import MyHardwareStep from '../components/connection-modal/my-hardware-step.jsx';
import VM from 'scratch-vm';

class ScanningStep extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handlePeripheralListUpdate',
            'handlePeripheralScanTimeout',
            'handleRefresh'
        ]);
        this.state = {
            scanning: true,
            peripheralList: []
        };
    }
    componentDidMount () {
        // Skip Bluetooth scanning for Web Serial extensions
        if (this.props.extensionId === 'myhardware') return;

        this.props.vm.scanForPeripheral(this.props.extensionId);
        this.props.vm.on(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.on(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    componentWillUnmount () {
        if (this.props.extensionId === 'myhardware') return;

        this.props.vm.removeListener(
            'PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
        this.props.vm.removeListener(
            'PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    }
    handlePeripheralScanTimeout () {
        this.setState({
            scanning: false,
            peripheralList: []
        });
    }
    handlePeripheralListUpdate (newList) {
        const peripheralArray = Object.keys(newList).map(id =>
            newList[id]
        );
        this.setState({peripheralList: peripheralArray});
    }
    handleRefresh () {
        this.props.vm.scanForPeripheral(this.props.extensionId);
        this.setState({
            scanning: true,
            peripheralList: []
        });
    }
    render () {
        // ── My Hardware: show Web Serial instructions instead of BT scanner ──
        if (this.props.extensionId === 'myhardware') {
            return (
                <MyHardwareStep
                    onConnectClick={this.props.onConnecting}
                />
            );
        }

        // ── All other extensions: normal Bluetooth scanning flow ──
        return (
            <ScanningStepComponent
                connectionSmallIconURL={this.props.connectionSmallIconURL}
                peripheralList={this.state.peripheralList}
                phase={this.state.phase}
                scanning={this.state.scanning}
                title={this.props.extensionId}
                onConnected={this.props.onConnected}
                onConnecting={this.props.onConnecting}
                onRefresh={this.handleRefresh}
                onUpdatePeripheral={this.props.onUpdatePeripheral}
            />
        );
    }
}

ScanningStep.propTypes = {
    connectionSmallIconURL: PropTypes.string,
    extensionId: PropTypes.string.isRequired,
    onConnected: PropTypes.func.isRequired,
    onConnecting: PropTypes.func.isRequired,
    onUpdatePeripheral: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default ScanningStep;