import {connect} from 'react-redux';
import {closeAuthModal} from '../reducers/modals';
import AuthModalComponent from '../components/auth-modal/auth-modal.jsx';

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeAuthModal())
});

export default connect(
    null,
    mapDispatchToProps
)(AuthModalComponent);
