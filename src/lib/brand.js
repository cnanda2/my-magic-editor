const appName = (typeof process !== 'undefined' && process.env && process.env.APP_NAME) || 'The STEM Educator';

// Legacy export format because this is used by some build-time scripts stuck in the past.
// eslint-disable-next-line import/no-commonjs
module.exports = {
    APP_NAME: appName
};
