import * as vscode from 'vscode';
import { IExtension, IExtensionPlugin, IDriverExtensionApi } from '@sqltools/types';
import { ExtensionContext } from 'vscode';
import { DRIVER_ALIASES } from './constants';
const { publisher, name} = require('../package.json');
const driverName = 'Oracle';

export async function activate(extContext: ExtensionContext): Promise<IDriverExtensionApi> {
  const sqltools = vscode.extensions.getExtension<IExtension>('mtxr.sqltools');
  if (!sqltools) {
    throw new Error('SQLTools not installed');
  }
  await sqltools.activate();

  const api = sqltools.exports;
  console.log('start----------------------');
  const extensionId = `${publisher}.${name}`;
  const plugin: IExtensionPlugin = {
    extensionId,
    name: `${driverName} Plugin`,
    type: 'driver',
    async register(extension) {
      // register ext part here
      extension.resourcesMap().set(`driver/${DRIVER_ALIASES[0].value}/icons`, {
        active: extContext.asAbsolutePath('icons/active.png'),
        default: extContext.asAbsolutePath('icons/default.png'),
        inactive: extContext.asAbsolutePath('icons/inactive.png'),
      });
      DRIVER_ALIASES.forEach(({ value }) => {
        extension.resourcesMap().set(`driver/${value}/extension-id`, extensionId);
        extension
          .resourcesMap()
          .set(`driver/${value}/connection-schema`, extContext.asAbsolutePath('connection.schema.json'));
        extension.resourcesMap().set(`driver/${value}/ui-schema`, extContext.asAbsolutePath('ui.schema.json'));
      });
      console.log('try to register');
      await extension.client.sendRequest('ls/RegisterPlugin', { path: extContext.asAbsolutePath('out/ls/plugin.js') });
      console.log('but rgister failed');
    }
  };
  api.registerPlugin(plugin);
  return {
    driverName: driverName,
    parseBeforeSaveConnection: ({ connInfo }) => {
      /**
       * This hook is called before saving the connection using the assistant
       * so you can do any transformations before saving it to disk.active
       */
      const propsToRemove = ['connectionMethod', 'id', 'usePassword'];
      if (connInfo.usePassword) {
        if (connInfo.usePassword.toString().toLowerCase().includes('ask')) {
          propsToRemove.push('password');
        } else if (connInfo.usePassword.toString().toLowerCase().includes('empty')) {
          connInfo.password = '';
          propsToRemove.push('askForPassword');
        } else if(connInfo.usePassword.toString().toLowerCase().includes('save')) {
          propsToRemove.push('askForPassword');
        }
      }
      propsToRemove.forEach(p => delete connInfo[p]);

      return connInfo;
    },
    parseBeforeEditConnection: ({ connInfo }) => {
      /**
       * This hook is called before editing the connection using the assistant
       * so you can do any transformations before editing it.
       */
      const formData: typeof connInfo = {
        ...connInfo,
        connectionMethod: 'Server and Port',
      };
      if (connInfo.connectString) {
        formData.connectionMethod = 'Connection String';
      }

      if (connInfo.askForPassword) {
        formData.usePassword = 'Ask on connect';
        delete formData.password;
      } else if (typeof connInfo.password === 'string') {
        delete formData.askForPassword;
        formData.usePassword = connInfo.password ? 'Save password' : 'Use empty password';
      }
      return formData;
    },
    driverAliases: DRIVER_ALIASES,
  };
}

export function deactivate() {}
