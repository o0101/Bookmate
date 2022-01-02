import util from 'util';

const ERR_NOS = util.getSystemErrorMap();
const ERR_CODES = [...ERR_NOS.entries()].reduce((M, [errno, [code, message]]) => {
  M.set(code, {errno, message}); 
  return M;
}, new Map());
ERR_CODES.default = ERR_CODES.has('EINVAL') ? 'EINVAL' : [...ERR_CODES.keys()].sort()[0];
ERR_NOS.default = ERR_CODES.get(ERR_CODES.default).errno;
export class SystemError extends Error {
  constructor(code = ERR_CODES.default, additionalMessage) {
    if ( ! ERR_CODES.has(code) ) {
      throw new TypeError(
        `class SystemError can only be instantiated with one of the following error codes: ${
          [...ERR_CODES.keys()].join(', ')
        }`
      );
    }
    super();
    const {errno, message} = ERR_CODES.get(code);
    this.errno = errno;
    this.message = message;
    if ( additionalMessage ) {
      this.message += `\nAdditional information: ${additionalMessage}`;
    }
  }
}
