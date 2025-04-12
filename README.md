# SQLTools Oracle Driver 
This package is part of [vscode-sqltools](https://vscode-sqltools.mteixeira.dev/?umd_source=repository&utm_medium=readme&utm_campaign=mysql) extension.


It is tested on Oracle Database 11.2.0 with 32-bit and 64-bit Oracle client libraries(windowns 10).

### Usage
After installing the oracle Driver for SQLTools, you will be able to create connections to oracle Database, explore tables and views, and run queries. For more information on how to use SQLTools please refer to [SQLTools extension](https://github.com/mtxr/vscode-sqltools)


### Prerequisites
#### For 64-bit Oracle client libraries
* Have 64-bit Node.js (version 14 or newer) and npm installed
* Have the oracledb@6.0.1 (Normally, Upon first use the Oracle driver extension prompts for permission to install the oracledb@6.0.1 package).

#### For 32-bit Oracle client libraries
* Have 32-bit Node.js (version 14 or newer) and npm installed(nvm can be used to manage different nodejs versions)
* Have the oracledb@6.0.1(Because there is no prebuilt binaries corresponding to this platform, you need to install according to the [official instructions](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#node-oracledb-installation-instructions)) in the specific directory(which is used for storing data for vscode-sqltools)(you can use everything to search "vscode-sqltools" to find the directory)
   * For me, I first download the [tgz File](https://github.com/oracle/node-oracledb/releases/download/v6.0.1/oracledb-src-6.0.1.tgz), then in the **\AppData\Local\vscode-sqltools\Data directory and run `npm install your_dir_path/oracledb-6.0.1.tgz`


### Installation
* From VS Code by searching SQLTools Oracle Driver
* From [marketplace](https://marketplace.visualstudio.com/items?itemName=hurly.sqltools-oracle-driver)
### ChageLog
#### 0.1.0
* First working version
#### 0.1.1
* (tables explore and completion etc) not restrict in current user
* fix the pool size in 4 for better performance
* change the original match(%info%) with just(info%) to avoid too many matches
#### 0.1.2
* fix some issue 
   * in the searchTables query, move the `order by` sentence out for efficiency
#### 0.1.4
* fix the issue(#3) that can't commit;
* add support for exec(**replace exec with call** before processing)
* ignore spool command (**add -- before spool** before processing)
* add better support for sentances splitting
   * sentances should be separated with **/**
      * begin with `declare` or `begin`
      * begin with `create`
         * followed by `procedure`,`function`,`trigger`
   * others separated with **;**
* add better support with (not select) sentances
   * only a summary page to show the result instead of many pages
* add support for showing error(you can see the error message in the **OUTPUT** of vscode)
#### 0.1.5
* new setting
   * add autoCommit option in the Connection Settings.
   * add lowercase option in the Connection Settings for completion.
* add *rows affted* and *executeTime* in the summary page for (`not select`) sentances;
* fix some issues
   * Statements with only comments are not processed to prevent errors.
   * `create` (or replace) `package` should also be separated with **/**.
   * `with` sentances should also be recognized as `select` sentances.

#### 0.1.6
* **add detailed error message**
* fix some issues
   * sql statement with '/' as division sign are wrongly seperated.
   * *show table recordes* doesn't support paging
* adjust the order of completion items.
* doesn't support for property(pk,fk) anymore for performance

#### 0.1.7
* update oracledb to 6.0.1 to support thin mode
* add option 'thickmode' to support thick mode in this version(default is thin mode)
* remove unessassary log code

#### 0.1.8
* add Support for DBMS_OUTPUT

#### 0.1.9
* add sql output in the sql console:message windows
* adjust implementation way for DBMS_OUTPUT according to advice from @a-langer

#### 0.1.10
* move dbms_output out of the loop to improve efficiency
* add dbms_output in the output channel

#### 0.1.11
* fix parse bugs when multiple kind of comments(such as /* and --) occure in one line
* fix parse bugs when / occures inside begin end block
* add maxRow option to prevent out of memory(when "limit prefetch rows" set true, "Show records default limit" will take effect)
* fix the activation issue

#### 0.1.12
* optimize parse code
* add support for privileged connection
* pooled connection is replaced with standalone connection

#### 0.1.14
* optimize code for standalone connection
* fix the issue #14

#### 0.1.16
* fix the issue #17 and activeTextEditor.document access faild

### Feedback
* If you have any questions, feel free to ask and I'll get back to you at the weekend.


Thanks to [vscode-sqltools](https://github.com/mtxr/vscode-sqltools), [node-oracledb](https://github.com/oracle/node-oracledb), [older sqltools oracle driver](https://github.com/mickeypearce/vscode-sqltools/tree/master/packages/drivers/oracle)