module.exports = (options) => ({
  ...options,
  externals: [
    function ({ request }, callback) {
      if (!request) return callback();

      // Always bundle @autoparts workspace packages
      if (request.startsWith('@autoparts/')) {
        return callback();
      }

      // Don't externalize local file references (relative, POSIX absolute, or Windows absolute)
      if (
        request.startsWith('.') ||
        request.startsWith('/') ||
        request.startsWith('\\') ||
        /^[A-Za-z]:[\\/]/.test(request)
      ) {
        return callback();
      }

      // Externalize all true node_modules
      callback(null, `commonjs ${request}`);
    },
  ],
});
