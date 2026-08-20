import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Modal from '../../containers/modal.jsx';
import {login, register, isLoggedIn, getUser} from '../../lib/auth-api';

import styles from './auth-modal.css';

const messages = defineMessages({
    signInTitle: {
        id: 'gui.authModal.signIn',
        defaultMessage: 'Sign In',
        description: 'Title for sign in modal'
    },
    registerTitle: {
        id: 'gui.authModal.register',
        defaultMessage: 'Register',
        description: 'Title for register modal'
    },
    username: {
        id: 'gui.authModal.username',
        defaultMessage: 'Username',
        description: 'Username field label'
    },
    email: {
        id: 'gui.authModal.email',
        defaultMessage: 'Email',
        description: 'Email field label'
    },
    password: {
        id: 'gui.authModal.password',
        defaultMessage: 'Password',
        description: 'Password field label'
    },
    signingIn: {
        id: 'gui.authModal.signingIn',
        defaultMessage: 'Signing in...',
        description: 'Sign in button loading'
    },
    registering: {
        id: 'gui.authModal.registering',
        defaultMessage: 'Registering...',
        description: 'Register button loading'
    },
    loggedInAs: {
        id: 'gui.authModal.loggedInAs',
        defaultMessage: 'Signed in as {username}',
        description: 'Logged in message'
    }
});

const AuthModalComponent = props => {
    const [tab, setTab] = React.useState('login');
    const [username, setUsername] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    const [error, setError] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    const [justLoggedIn, setJustLoggedIn] = React.useState(false);

    const {intl, onRequestClose} = props;

    if (justLoggedIn) {
        const user = getUser();
        return (
            <Modal
                className={styles.modalContent}
                contentLabel={intl.formatMessage(messages.signInTitle)}
                onRequestClose={onRequestClose}
            >
                <div className={styles.body}>
                    <div className={styles.successMsg}>
                        <FormattedMessage
                            {...messages.loggedInAs}
                            values={{username: <span className={styles.username}>{user?.username}</span>}}
                        />
                    </div>
                    <button className={styles.submitBtn} onClick={onRequestClose}>
                        Continue
                    </button>
                </div>
            </Modal>
        );
    }

    const handleLogin = async e => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password);
            setJustLoggedIn(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRegister = async e => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setSubmitting(true);
        try {
            await register(username, email, password);
            setJustLoggedIn(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            className={styles.modalContent}
            contentLabel={intl.formatMessage(tab === 'login' ? messages.signInTitle : messages.registerTitle)}
            onRequestClose={onRequestClose}
        >
            <div className={styles.body}>
                <div className={styles.tabs}>
                    <button
                        className={classNames(styles.tab, {[styles.tabActive]: tab === 'login'})}
                        onClick={() => { setTab('login'); setError(''); }}
                    >
                        <FormattedMessage {...messages.signInTitle} />
                    </button>
                    <button
                        className={classNames(styles.tab, {[styles.tabActive]: tab === 'register'})}
                        onClick={() => { setTab('register'); setError(''); }}
                    >
                        <FormattedMessage {...messages.registerTitle} />
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
                    <div className={styles.field}>
                        <label><FormattedMessage {...messages.username} /></label>
                        <input
                            type="text" required autoFocus
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>

                    {tab === 'register' && (
                        <div className={styles.field}>
                            <label><FormattedMessage {...messages.email} /></label>
                            <input
                                type="email" required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <label><FormattedMessage {...messages.password} /></label>
                        <input
                            type="password" required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {tab === 'register' && (
                        <div className={styles.field}>
                            <label>Confirm Password</label>
                            <input
                                type="password" required
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                            />
                        </div>
                    )}

                    <button className={styles.submitBtn} type="submit" disabled={submitting}>
                        {submitting ? (
                            <FormattedMessage {...(tab === 'login' ? messages.signingIn : messages.registering)} />
                        ) : (
                            <FormattedMessage {...(tab === 'login' ? messages.signInTitle : messages.registerTitle)} />
                        )}
                    </button>
                    <div className={styles.switchLink}>
                        {tab === 'login' ? (
                            <span>
                                Don't have an account?{' '}
                                <button type="button" onClick={() => { setTab('register'); setError(''); }}>
                                    Register
                                </button>
                            </span>
                        ) : (
                            <span>
                                Already have an account?{' '}
                                <button type="button" onClick={() => { setTab('login'); setError(''); }}>
                                    Sign In
                                </button>
                            </span>
                        )}
                    </div>
                </form>
            </div>
        </Modal>
    );
};

AuthModalComponent.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func
};

export default injectIntl(AuthModalComponent);
