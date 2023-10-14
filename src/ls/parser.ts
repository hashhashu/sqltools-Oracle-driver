/**
 * copied from https://github.com/TeamSQL/SQL-Statement-Parser/blob/dev/src/index.ts
 * minor improvements
 * adapted for oracle and add other things by hurly
 */
class QueryParser {
  static parse(query: string, driver: 'pg' | 'mysql' | 'mssql' | 'cql' | 'oracle' = 'oracle'): {queries:  Array<string>,
    isSelectQueries: Array<boolean>, rows: Array<number>, columns: Array<number>}{
    const delimiter: string = ';';
    const queries: Array<string> = [];
    const isSelectQueries: Array<boolean> = [];
    const rows: Array<number> = [1];
    const columns: Array<number> = [1];
    let rowAccu = 1;
    let columnAccu = 1;
    const flag = true;
    let restOfQuery;
    // macro substitution
    // if (macroFile!='' && fs.existsSync(macroFile)){
    //  let userBugsJson = JSON.parse(fs.readFileSync(macroFile).toString());
    //  //获取Json里key为data的数据
    //  const data = userBugsJson['data'];
    //  return data;
    // }
    // ignore spool
    query = query.replace(/^(\s*?)spool\s+?/gim,'$1--spool ');
    // replace exec with call
    query = query.replace(/^(\s*?)exec\s+?/gim,'$1call ');
    while (flag) {
      if (restOfQuery == null) {
        restOfQuery = query;
      }
      const statementAndRest = QueryParser.getStatements(restOfQuery, driver, delimiter, rowAccu, columnAccu);

      const statement = statementAndRest[0];
      rowAccu = parseInt(statementAndRest[4]);
      columnAccu = parseInt(statementAndRest[5]);
      let allComment = (statementAndRest[3] == "true")?true:false;
      if (statement != null && statement.trim() != '' && !allComment) {
        queries.push(statement);
        isSelectQueries.push(statementAndRest[2] == "true"?true:false);
        rows.push(rowAccu);
        columns.push(columnAccu);
      }

      restOfQuery = statementAndRest[1];
      if (restOfQuery == null || restOfQuery.trim() == '') {
        break;
      }
    }

    return {queries:queries, isSelectQueries:isSelectQueries, rows:rows, columns:columns};
  }
  static getWord(charArray: Array<string>, index): string{
    let word = '';
    for(let i = index; i < charArray.length; i++){
      if(!(/\s/.test(charArray[i]))){
        index = i;
        break;
      }
    }
    for(let i = index; i < charArray.length; i++){
      if(/\s/.test(charArray[i])){
          break;
        }
      word+=charArray[i];
    }
    word = word.toLowerCase();
    return word;
  }
  static getStatements(query: string, driver: string, delimiter: string, rowAccu: number, columnAccu: number): Array<string> {
    let previousChar: string = null;
    let isInComment: boolean = false;
    let isInString: boolean = false;
    let isInTag: boolean = false;
    let nextChar: string = null;
    let commentChar: string = null;
    let stringChar: string = null;
    let tagChar: string = null;
    let isInCreate: boolean = false;
    let isFirst: boolean = true;

    const charArray: Array<string> = Array.from(query);
    let arrayInclude = ["procedure","function","trigger","package"];
    let arrayExclude = ["database","tablespace","user","table","index","sequence","view"]; //for efficiency
    let isSelectQuery = false;
    let resultQueries: Array<string> = [];
    for (let index = 0; index < charArray.length; index++) {
      let char = charArray[index];
      if (index > 0) {
        previousChar = charArray[index - 1];
      }

      if (index < charArray.length) {
        nextChar = charArray[index + 1];
      }
      ++columnAccu;
      if(char == '\n'){
        rowAccu += 1;
        columnAccu = 1;
      }

      // it's in string, go to next char
      if (previousChar != '\\' && (char == "'" || char == '"') && isInString == false && isInComment == false) {
        isInString = true;
        stringChar = char;
        continue;
      }

      // it's comment, go to next char
      if (
        ((char == '#' && nextChar == ' ') || (char == '-' && nextChar == '-') || (char == '/' && nextChar == '*')) &&
        isInString == false && isInComment == false
      ) {
        isInComment = true;
        commentChar = char;
        continue;
      }
      // it's end of comment, go to next
      if (
        isInComment == true &&
        (((commentChar == '#' || commentChar == '-') && char == '\n') ||
          (commentChar == '/' && char == '*' && nextChar == '/'))
      ) {
        if(commentChar == '/'){
          index++;
        }
        isInComment = false;
        commentChar = null;

        continue;
      }

      // string closed, go to next char
      if (previousChar != '\\' && char == stringChar && isInString == true) {
        isInString = false;
        stringChar = null;
        continue;
      }
      if(/\s/.test(char)){
        continue;
      }
      // fetch sql type('/' or ';' should not be treated as sql type)
      if(!isInComment && isFirst && (char!='/' && char!=';')){
        let word = this.getWord(charArray, index);
        if(word == "create"){
          isInCreate = true;
        }
        else if(word == "declare" || word == "begin" ){
          delimiter = '/';
        }
        else if(word == "select" || word == "with"){
          isSelectQuery = true;
        }
        isFirst = false;
      }
      // sql like procedure etc. needs to end with /
      if(!isInComment && isInCreate){
        let word = this.getWord(charArray, index);
        if(arrayInclude.includes(word)){
          delimiter = '/';
          isInCreate = false;
        }
        else if(arrayExclude.includes(word)){
          isInCreate = false;
        }
      }

      if (char == '$' && isInComment == false && isInString == false) {
        const queryUntilTagSymbol = query.substring(index);
        if (isInTag == false) {
          const tagSymbolResult = QueryParser.getTag(queryUntilTagSymbol, driver);
          if (tagSymbolResult != null) {
            isInTag = true;
            tagChar = tagSymbolResult[0];
          }
        } else {
          const tagSymbolResult = QueryParser.getTag(queryUntilTagSymbol, driver);
          if (tagSymbolResult != null) {
            const tagSymbol = tagSymbolResult[0];
            if (tagSymbol == tagChar) {
              isInTag = false;
            }
          }
        }
      }

      // it's a query, continue until you get delimiter hit
      if (
        (char.toLowerCase() === delimiter.toLowerCase()) &&
        isInString == false &&
        isInComment == false &&
        isInTag == false
      ) {
        // ignore / inside begin end block;
        if(delimiter == '/')
        {
          let closeReal = true;
          for(let index1 = index-1 ;index1 >=0; index1--)
          {
            if(charArray[index1] == ';'){
              break;
            }
            if(!(/\s/.test(charArray[index1]))){
              closeReal = false;
              break;
            }
          }
          if(!closeReal){
            continue;
          }
        }

        let splittingIndex = index + 1;
        // continue until hit not \s
        index = splittingIndex;
        while(index < charArray.length && /\s/.test(charArray[index])){
          ++columnAccu;
          if(charArray[index] == '\n'){
            ++rowAccu;
            columnAccu = 1;
          }
          ++index;
        }
        resultQueries = QueryParser.getQueryParts(query, splittingIndex-1, index);
        break;
      }
    }
    if (resultQueries.length == 0) {
      // if (query != null) {
      //   query = query.trim();
      // }
      resultQueries.push(query, null);
    }
    resultQueries.push(isSelectQuery?"true":"false");
    // is all comment
    resultQueries.push(isFirst?"true":"false");
    resultQueries.push(rowAccu.toString());
    resultQueries.push(columnAccu.toString());

    return resultQueries;
  }

  static getQueryParts(query: string, splittingIndex: number, nextIndex: number = 1): Array<string> {
    let statement: string = query.substring(0, splittingIndex);
    const restOfQuery: string = query.substring(nextIndex);
    const result: Array<string> = [];
    // if (statement != null) {
    //   statement = statement.trim();
    // }
    result.push(statement);
    result.push(restOfQuery);
    return result;
  }


  static getTag(query: string, driver: string): Array<any> {
    if (driver == 'pg') {
      const matchTag = query.match(/^(\$[a-zA-Z]*\$)/i);
      if (matchTag != null && matchTag.length > 1) {
        const result: Array<any> = [];
        const tagSymbol = matchTag[1].trim();
        const indexOfCmd = query.indexOf(tagSymbol);
        result.push(tagSymbol);
        result.push(indexOfCmd);
        return result;
      } else {
        return null;
      }
    }
  }

}

export default QueryParser.parse;
