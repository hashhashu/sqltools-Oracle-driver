import { IBaseQueries, ContextValue, NSDatabase} from '@sqltools/types';
import queryFactory from '@sqltools/base-driver/dist/lib/factory';

function escapeTableName(table: Partial<NSDatabase.ITable>) {
  return `${table.label || table.toString()}`;
}

const describeTable: IBaseQueries['describeTable'] = queryFactory`
SELECT * from user_tab_columns t
 WHERE t.TABLE_NAME = '${p => escapeTableName(p)}'
 ORDER BY t.COLUMN_NAME
`;

const fetchColumns: IBaseQueries['fetchColumns'] = queryFactory`
select t.COLUMN_NAME as "label",
       '${ContextValue.COLUMN}' as "type",
       t.TABLE_NAME as "table",
       t.DATA_TYPE as "dataType",
       t.DATA_LENGTH as "size",
       user as "schema",
       SYS_CONTEXT ('USERENV', 'DB_NAME') as "database",
       t.DATA_DEFAULT as "defaultValue",
       user as "catalog",
       t.NULLABLE    as "isNullable",
       upper(t.DATA_TYPE || 
         decode(t.DATA_LENGTH,null,'',
           '(' || t.DATA_LENGTH || decode(t.DATA_PRECISION,null,'', 
                                          ',' || t.DATA_PRECISION) || ')')) as "detail",
       decode(pri.constraint_type,'P',1,0) as "isPk",
       decode(pri.constraint_type,'R',1,0) as "isFk"
  from user_tab_columns t, (select ucc.table_name, ucc.column_name, uct.constraint_type 
                              from user_cons_columns ucc, user_constraints uct
                             where ucc.constraint_name = uct.constraint_name
                               and uct.constraint_type in ('P','R')) pri
 where t.TABLE_NAME = '${p => escapeTableName(p)}'
   and t.TABLE_NAME = pri.table_name(+)
   and t.COLUMN_NAME = pri.column_name(+)
 order by
   t.TABLE_NAME, 
   t.COLUMN_ID
`;

const fetchRecords: IBaseQueries['fetchRecords'] = queryFactory`
SELECT * FROM
  (SELECT ROWNUM NO,t.*
     FROM ${p => escapeTableName(p.table)} t)t
 WHERE t.NO > ${p => p.offset || 0}
   AND t.NO <= ${p => p.offset || 0} + ${p => p.limit || 50};
`;

const countRecords: IBaseQueries['countRecords'] = queryFactory`
SELECT count(1) AS total
FROM ${p => escapeTableName(p.table)};
`;


const fetchTables: IBaseQueries['fetchTables'] = queryFactory`
select t.table_name as "label",
       '${ContextValue.TABLE}' as "type",
       user as "schema",
       SYS_CONTEXT ('USERENV', 'DB_NAME') as "database",
       user as "catalog",
       0 as "isView"
  from user_tables t
 order by
 t.table_name
`;
const fetchViews: IBaseQueries['fetchTables'] = queryFactory`
select t.view_name as "label",
       '${ContextValue.VIEW}' as "type",
       user as "schema",
       SYS_CONTEXT ('USERENV', 'DB_NAME') as "database",
       user as "catalog",
       1 as "isView"
  from user_views t
 order by
 t.view_name
`;

const searchTables: IBaseQueries['searchTables'] = queryFactory`
select t.*
from(select t.label        "label",
            t.type         "type",
            t.isView       "isView",
            t.description  "description",
            t.schema       "schema",
            t.database     "database",
            t.catalog      "catalog",
            t.detail       "detail" 
       from(select  t.view_name as                        label,
                    '${ContextValue.VIEW}' as             type,
                    1 as                                  isView,
                    'view' as                             description,
                    user as                            schema,
                    SYS_CONTEXT ('USERENV', 'DB_NAME') as database,
                    user as catalog,
                    user || '.' || t.view_name as      detail
              from user_views t
            union all
            select  t.table_name as                       label,
                    '${ContextValue.TABLE}' as            type,
                    0 as                                  isView,
                    'table' as                            description,
                    user as                            schema,
                    SYS_CONTEXT ('USERENV', 'DB_NAME') as database,
                    user as                               catalog,
                    user || '.' || t.table_name as     detail
              from user_tables t) t
    where 1 = 1
    ${p => p.search ? `AND (
      lower(t.label) LIKE '%${p.search.toLowerCase()}%'
    )` : ''}
  order by
    t.label
  )t
  where rownum <= ${p => p.limit || 100}

`;
const searchColumns: IBaseQueries['searchColumns'] = queryFactory`
select t.*
  from(select t.COLUMN_NAME as "label",
              '${ContextValue.COLUMN}' as "type",
              t.TABLE_NAME as "table",
              t.DATA_TYPE as "dataType",
              t.DATA_LENGTH as "size",
              user as "schema",
              SYS_CONTEXT ('USERENV', 'DB_NAME') as "database",
              user as "catalog",
              t.DATA_DEFAULT as "defaultValue",
              t.NULLABLE    as "isNullable",
              upper(t.DATA_TYPE || 
              decode(t.DATA_LENGTH,null,'',
                    '(' || t.DATA_LENGTH || decode(t.DATA_PRECISION,null,'', 
                                                  ',' || t.DATA_PRECISION) || ')')) as "detail",
              0 as "isPk",
              0 as "isFk"
         from user_tab_columns t
        where 1 = 1 
          ${p => p.tables.filter(t => !!t.label).length
          ? `AND LOWER(t.TABLE_NAME) IN (${p.tables.filter(t => !!t.label).map(t => `'${t.label}'`.toLowerCase()).join(', ')})`
          : ''
          }
         ${p => p.search
          ? `AND (
          lower(t.TABLE_NAME || '.' || t.COLUMN_NAME) LIKE '%${p.search.toLowerCase()}%'
          OR lower(user || '.' || t.TABLE_NAME) LIKE '%${p.search.toLowerCase()}%'
          OR lower(t.COLUMN_NAME) LIKE '%${p.search.toLowerCase()}%'
          )`
          : ''
          }
        order by
        t.TABLE_NAME, 
        t.COLUMN_NAME)t
where rownum <= ${p => p.limit || 1000}
`;

export default {
  describeTable,
  countRecords,
  fetchColumns,
  fetchRecords,
  fetchTables,
  fetchViews,
  searchTables,
  searchColumns
}
