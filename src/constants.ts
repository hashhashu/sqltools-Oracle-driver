import { IDriverAlias } from '@sqltools/types';
import envPaths from 'env-paths';
import path from 'path';
import fs from 'fs';
import * as mkdir from 'make-dir';

/**
 * Aliases for yout driver. EG: PostgreSQL, PG, postgres can all resolve to your driver
 */
export const DRIVER_ALIASES: IDriverAlias[] = [{ displayName: 'Oracle', value: 'Oracle' }];

const SQLTOOLS_PATHS = envPaths(`vscode-${process.env.EXT_NAMESPACE || 'sqltools'}`, { suffix: null });
if (!fs.existsSync(SQLTOOLS_PATHS.data)) {
  mkdir.sync(SQLTOOLS_PATHS.data);
}
const Oracle_Data_Path = path.join(SQLTOOLS_PATHS.data,'oracle');
if (!fs.existsSync(Oracle_Data_Path)) {
  mkdir.sync(Oracle_Data_Path);
}

export const Oracle_Diagnosis_Path = path.join(Oracle_Data_Path,'oracle_diagnosis.json');
export const Oracle_Log_Path = path.join(Oracle_Data_Path,'log.json');

