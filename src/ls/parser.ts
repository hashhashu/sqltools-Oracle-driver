/**
 * copied from https://github.com/TeamSQL/SQL-Statement-Parser/blob/dev/src/index.ts
 * minor improvements
 * adapted for oracle and add other things
 */

class QueryParser {
  static parse(query: string, driver: 'pg' | 'mysql' | 'mssql' | 'cql' | 'oracle' = 'oracle'): {queries:  Array<string>,
    isSelectQueries: Array<boolean>}{
    const delimiter: string = ';';
    const queries: Array<string> = [];
    const isSelectQueries: Array<boolean> = [];
    const flag = true;
    let restOfQuery;
    // ignore spool
    query = query.replace(/^\s*spool\s+?/gim,'--spool ');
    // replace exec with call
    query = query.replace(/^\s*exec\s+/gim,'call ');
    while (flag) {
      if (restOfQuery == null) {
        restOfQuery = query;
      }
      const statementAndRest = QueryParser.getStatements(restOfQuery, driver, delimiter);

      const statement = statementAndRest[0];
      if (statement != null && statement.trim() != '' && statement.trim() != '/') {
        queries.push(statement);
        if(statementAndRest[2] == "true"){
          isSelectQueries.push(true);
        }
        else{
          isSelectQueries.push(false);
        }
      }

      restOfQuery = statementAndRest[1];
      if (restOfQuery == null || restOfQuery.trim() == '') {
        break;
      }
    }

    return {queries:queries, isSelectQueries:isSelectQueries};
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
  static getStatements(query: string, driver: string, delimiter: string): Array<string> {
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
    let arrayInclude = ["procedure","function","trigger"];
    let arrayExclude = ["database","tablespace","user","table","index","sequence","view","package"]; //for efficiency
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

      // it's in string, go to next char
      if (previousChar != '\\' && (char == "'" || char == '"') && isInString == false && isInComment == false) {
        isInString = true;
        stringChar = char;
        continue;
      }

      // it's comment, go to next char
      if (
        ((char == '#' && nextChar == ' ') || (char == '-' && nextChar == '-') || (char == '/' && nextChar == '*')) &&
        isInString == false
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
      // fetch sql type
      if(!isInComment && isFirst){
        let word = this.getWord(charArray, index);
        if(word == "create"){
          isInCreate = true;
        }
        else if(word == "declare" || word == "begin" ){
          delimiter = '/';
        }
        else if(word == "select"){
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
        (char.toLowerCase() === delimiter.toLowerCase() ||
        char.toLowerCase() == '/') &&
        isInString == false &&
        isInComment == false &&
        isInTag == false
      ) {
        let splittingIndex = index + 1;
        resultQueries = QueryParser.getQueryParts(query, splittingIndex-1, 1);
        break;
      }
    }
    if (resultQueries.length == 0) {
      if (query != null) {
        query = query.trim();
      }
      resultQueries.push(query, null);
    }
    if(isSelectQuery){
      resultQueries.push('true');
    }
    else{
      resultQueries.push('false');
    }

    return resultQueries;
  }

  static getQueryParts(query: string, splittingIndex: number, numChars: number = 1): Array<string> {
    let statement: string = query.substring(0, splittingIndex);
    const restOfQuery: string = query.substring(splittingIndex + numChars);
    const result: Array<string> = [];
    if (statement != null) {
      statement = statement.trim();
    }
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
