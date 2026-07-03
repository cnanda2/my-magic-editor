const SET_ID = 'scratch-gui/connection-modal/setId';
const SET_TYPE = 'scratch-gui/connection-modal/setType';

const initialState = {
    extensionId: null,
    connectionType: null // 'usb', 'bluetooth', or null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case SET_ID:
        return Object.assign({}, state, {
            extensionId: action.extensionId
        });
    case SET_TYPE:
        return Object.assign({}, state, {
            connectionType: action.connectionType
        });
    default:
        return state;
    }
};

const setConnectionModalExtensionId = function (extensionId) {
    return {
        type: SET_ID,
        extensionId: extensionId
    };
};

const setConnectionModalType = function (connectionType) {
    return {
        type: SET_TYPE,
        connectionType: connectionType
    };
};

export {
    reducer as default,
    initialState as connectionModalInitialState,
    setConnectionModalExtensionId,
    setConnectionModalType
};
