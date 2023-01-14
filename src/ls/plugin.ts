import { ILanguageServerPlugin,IConnectionDriverConstructor} from '@sqltools/types';
import OracleDriver from './driver';
import { DRIVER_ALIASES } from './../constants';

const OracleDriverPlugin: ILanguageServerPlugin = {
  register(server) {
    DRIVER_ALIASES.forEach(({ value }) => {
      server.getContext().drivers.set(value, OracleDriver as IConnectionDriverConstructor);
    });
  }
}

export default OracleDriverPlugin;
