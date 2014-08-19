module.exports = function (urlLib) {
  if (urlLib) {
    return require(urlLib);
  }

  return require('url');
};
