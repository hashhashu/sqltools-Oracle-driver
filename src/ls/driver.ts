import OracleDBLib from 'oracledb'
import AbstractDriver from '@sqltools/base-driver';
import queries from './queries';
import { IConnectionDriver, MConnectionExplorer, NSDatabase, ContextValue, Arg0 } from '@sqltools/types';
import parse from './parser';
import { v4 as generateId } from 'uuid';
import {Oracle_Diagnosis_Path} from '../constants';
import fs from 'fs';

const toBool = (v: any) => v && (v.toString() === '1' || v.toString().toLowerCase() === 'true' || v.toString().toLowerCase() === 'yes');

export interface PoolConfig{
  // 
  autoCommit?: boolean;
  lowerCase?: boolean; //lowcase for completion
  macroFile?: string; //file configured for macro substitution
  thickMode?: boolean;
}


export default class OracleDriver extends AbstractDriver<OracleDBLib.Pool, PoolConfig> implements IConnectionDriver {

  /**
   * If you driver depends on node packages, list it below on `deps` prop.
   * It will be installed automatically on first use of your driver.
   */
  public readonly deps: typeof AbstractDriver.prototype['deps'] = [{
    type: AbstractDriver.CONSTANTS.DEPENDENCY_PACKAGE,
    name: 'oracledb',
    version: '6.0.1',
  }];


  queries = queries;
  autoCommit = false;
  lowerCase = false;
  macroFile = '';

  /** if you need to require your lib in runtime and then
   * use `this.lib.methodName()` anywhere and vscode will take care of the dependencies
   * to be installed on a cache folder
   **/
  private get lib(): typeof OracleDBLib {
    const oracledb = this.requireDep('oracledb');
    oracledb.fetchAsString = [oracledb.DATE, oracledb.CLOB, oracledb.NUMBER];
    return oracledb;
  }

  public async open() {
    if (this.connection) {
      return this.connection;
    }
    if(!this.credentials.connectString){
      if (this.credentials.server && this.credentials.port) {
        this.credentials.connectString = `${this.credentials.server}:${this.credentials.port}/${this.credentials.database}`;
      } else {
        this.credentials.connectString = this.credentials.database;
      }
    }
    if(this.credentials.oracleOptions){
      if(this.credentials.oracleOptions.autoCommit){
        this.autoCommit = this.credentials.oracleOptions.autoCommit;
      }
      if(this.credentials.oracleOptions.lowerCase){
        this.lowerCase = this.credentials.oracleOptions.lowerCase;
      }
      if(this.credentials.oracleOptions.macroFile){
        this.macroFile = this.credentials.oracleOptions.macroFile;
      }
      if(this.credentials.oracleOptions.thickMode){
        this.lib.initOracleClient();
      }
    }
    
    const pool = await this.lib.createPool({
      user: this.credentials.username,
      password: this.credentials.password,
      connectString: this.credentials.connectString,
      poolIncrement : 0,
      poolMax       : 4,
      poolMin       : 4
    });

    return new Promise<OracleDBLib.Pool>((resolve, reject) => {
      pool.getConnection(async (err, conn) => {
        if (err) return reject(err);
        await conn.ping(async error => {
          if (error) return reject(error);
          this.connection = Promise.resolve(pool);
          await conn.close();
          return resolve(this.connection);
        });
      });
    });
  }

  public async close() {
    if (!this.connection) return Promise.resolve();
    return this.connection.then((pool) => {
      return new Promise<void>((resolve, reject) => {
        pool.close(10,(err) => {
          if (err) return reject(err);
          this.connection = null;
          return resolve();
        });
      });
    });
  }

  public query: (typeof AbstractDriver)['prototype']['query'] = async (query, opt = {}) => {
    return await this.open().then(async (pool): Promise<NSDatabase.IResult[]> => {
      const { requestId } = opt;
      return new Promise(async (resolve, reject) => {
        await pool.getConnection(async (err, conn) => {
          let currentQuery:string;
          let resultsAgg: NSDatabase.IResult[] = [];
          const messages = [];
          let row,column;
          try{
            if (err) return reject(err);
            const parseQueries = parse(query.toString());
            const queries = parseQueries.queries;
            const isSelectQueries = parseQueries.isSelectQueries;
            const rows = parseQueries.rows;
            const columns = parseQueries.columns;
            let binds = {};
            let options = {
              outFormat: this.lib.OUT_FORMAT_OBJECT,   // query result format
              dmlRowCounts: true,                      //the number of rows affected by each input row
              autoCommit: this.autoCommit   //control autocommit
            };
            // conn.execute(`ALTER SESSION SET NLS_NUMERIC_CHARACTERS = '.,'`);
            let rowsAffectedAll: number = 0;
            let selectQueryNum: number = 0;
            for (var i =0;i<queries.length;i++) {
              let q = queries[i];
              // console.log(q);
              currentQuery = q;
              row = rows[i];
              column = columns[i];
              if(isSelectQueries[i]){
                selectQueryNum += 1;
              }
              const res: any = await conn.execute(q,binds,options) || [];
              
              if (res.rowsAffected && !isSelectQueries[i]) {
                rowsAffectedAll += res.rowsAffected;
              }
              if(isSelectQueries[i]){
                resultsAgg.push(<NSDatabase.IResult>{
                  requestId,
                  resultId: generateId(),
                  connId: this.getId(),
                  cols: (res.rows && res.rows.length>0) ? Object.keys(res.rows[0]) : [],
                  messages,
                  query: q,
                  results: res.rows,
                });
              }
            }
            if(selectQueryNum < queries.length){
              if(rowsAffectedAll>0){
                messages.push(this.prepareMessage(`${rowsAffectedAll} rows were affected.`));
              }
              let executeTime = new Date();
              resultsAgg.push(<NSDatabase.IResult>{
                requestId,
                resultId: generateId(),
                connId: this.getId(),
                cols: ['result', 'executeTime'],
                messages,
                query: 'summary',
                results: [{'result':rowsAffectedAll+' rows were affected','executeTime':executeTime.toLocaleTimeString()}],
              });
            }
            fs.writeFileSync(Oracle_Diagnosis_Path,JSON.stringify({"state":"0","query":query.toString()}));
            return resolve(resultsAgg);
          }catch(err){
            console.log(currentQuery);
            console.log(err);
            for(var i=0;i<err.offset;i++){
              ++column;
              if(currentQuery[i] == '\n'){
                ++row;
                column = 1;
              }
            }
            messages.push(err.message+'\n'+'intra-block-posi:('+row+','+column+')');
            resultsAgg.push(<NSDatabase.IResult>{
              requestId,
              resultId: generateId(),
              connId: this.getId(),
              cols: [],
              messages,
              error: true,
              rawError: err,
              query: currentQuery,
              results: [],
            });
            let data = JSON.stringify({"state":"0","query":query.toString(),"currentQuery":currentQuery,"message":err.message,"row":row-1,'column':column-1, "offset":err.offset});
            fs.writeFileSync(Oracle_Diagnosis_Path,data);
            return resolve(resultsAgg);
          }finally {
            if (conn) {
              await conn.close();
            }
          }
        });
      });
    });
  }

  /** if you need a different way to test your connection, you can set it here.
   * Otherwise by default we open and close the connection only
   */
  public async testConnection() {
    await this.open();
    await this.query('SELECT 1 FROM DUAL', {});
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * it gets the child items based on current item
   */
  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Tables', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE },
          { label: 'Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.VIEW },
        ];
      case ContextValue.TABLE:
      case ContextValue.VIEW:
       return this.queryResults(this.queries.fetchColumns(item as NSDatabase.ITable)); 
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
    }
    return [];
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * It gets the child based on child types
   */
  private async getChildrenForGroup({ parent, item }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.childType) {
      case ContextValue.TABLE:
        return this.queryResults(this.queries.fetchTables(parent as NSDatabase.ISchema));
      case ContextValue.VIEW: 
        return this.queryResults(this.queries.fetchViews(parent as NSDatabase.ISchema));
    }
    return [];
  }
    /**
   * This method is a helper for intellisense and quick picks.
   */
  public async searchItems(itemType: ContextValue, search: string, extraParams: any = {}): Promise<NSDatabase.SearchableItem[]> {
    switch (itemType) {
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        return this.queryResults(this.queries.searchTables({ search })).then(r => r.map(t => {
          if(this.lowerCase){
            t.label = t.label.toLowerCase();
          }
          t.isView = toBool(t.isView);
          return t;
        }));
      case ContextValue.COLUMN:
        return this.queryResults(this.queries.searchColumns({ search, ...extraParams })).then(r => r.map(c => {
          if(this.lowerCase){
            c.label = c.label.toLowerCase();
          }
          c.isPk = toBool(c.isPk);
          c.isFk = toBool(c.isFk);
          return c;
        }));
    }
  }

  public getStaticCompletions: IConnectionDriver['getStaticCompletions'] = async () => {
    return {};
  }
}
