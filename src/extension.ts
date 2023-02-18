import * as vscode from 'vscode';
import { IExtension, IExtensionPlugin, IDriverExtensionApi } from '@sqltools/types';
import { ExtensionContext } from 'vscode';
import { DRIVER_ALIASES, Oracle_Diagnosis_Path} from './constants';
import { Oracle_Log_Path } from './constants';
import fs from 'fs';
const { publisher, name} = require('../package.json');
const driverName = 'Oracle';
let diagnosticCollection: vscode.DiagnosticCollection;

function getWordRangeAtPosition(text: string, start: number): {start:number, end:number}{
    let wordStart = 0;
    for(let i = start; i >=0; i--){
      if(!(/\w/.test(text[i]))){
        wordStart = i+1;
        break;
      }
    }
    let wordEnd = text.length;
    for(let i = start; i < text.length; i++){
      if(!(/\w/.test(text[i]))){
        wordEnd = i;
        break;
      }
    }
    return {start:wordStart, end:wordEnd};
  }

export async function activate(extContext: ExtensionContext): Promise<IDriverExtensionApi> {
  const sqltools = vscode.extensions.getExtension<IExtension>('mtxr.sqltools');
  if (!sqltools) {
    throw new Error('SQLTools not installed');
  }
  await sqltools.activate();
  const api = sqltools.exports;
  const extensionId = `${publisher}.${name}`;
  diagnosticCollection = vscode.languages.createDiagnosticCollection('sql-oracle');
  extContext.subscriptions.push(diagnosticCollection);
  setInterval(function(e){
    let document = vscode.window.activeTextEditor.document;
    let uri = document.uri;
    if(uri.toString().endsWith('.sql')){
      fs.appendFileSync(Oracle_Log_Path,JSON.stringify({"path":uri.path}));
      // fs.writeFileSync(Oracle_Log_Path,JSON.stringify({"uri":uri.toString()}));
      let content = JSON.parse(fs.readFileSync(Oracle_Diagnosis_Path).toString());
      if(content.state && content.state == "0"){
        if(content.query){
          let query = content.query;
          query = query.replace(/^(\s*?)spool\s+?/gim,'$1--spool ');
          query = query.replace(/^(\s*?)exec\s+?/gim,'$1call ');

          let text = document.getText();
          text = text.replace(/^(\s*?)spool\s+?/gim,'$1--spool ');
          text = text.replace(/^(\s*?)exec\s+?/gim,'$1call ');

          let blockStartIndex = text.indexOf(query);
          let line = 0;
          if(blockStartIndex !=-1){
            if(content.currentQuery){
              for(var i=0;i<blockStartIndex;i++){
                if(text[i] == '\n'){
                  ++line;
                }
              }
              text = text.substring(blockStartIndex,blockStartIndex+query.length);
              let errorIndex = content.offset + text.indexOf(content.currentQuery);
              let wordRange =  getWordRangeAtPosition(text, errorIndex);
              let columnStart = content.column - (errorIndex - wordRange.start);
              let columnEnd = content.column + (wordRange.end - errorIndex);
              let range = new vscode.Range(line + content.row, columnStart, line + content.row, columnEnd);
              let diagnostics = [];
              diagnostics.push(new vscode.Diagnostic(range, content.message));
              diagnosticCollection.set(uri,diagnostics);
            }
            else{
              diagnosticCollection.set(uri,[]);
            }
            fs.writeFileSync(Oracle_Diagnosis_Path,JSON.stringify({"state":"1"}));
          }
        }
        
      }
    }
  },200);
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
      await extension.client.sendRequest('ls/RegisterPlugin', { path: extContext.asAbsolutePath('out/ls/plugin.js') });
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
