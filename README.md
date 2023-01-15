# SQLTools Oracle Driver 
This package is part of [vscode-sqltools](https://vscode-sqltools.mteixeira.dev/?umd_source=repository&utm_medium=readme&utm_campaign=mysql) extension.


It is tested on Oracle Database 11.2.0 with 32-bit Oracle client libraries(windowns 10).

### Usage
After installing the oracle Driver for SQLTools, you will be able to create connections to oracle Database, explore tables and views, and run queries. For more information on how to use SQLTools please refer to [SQLTools extension](https://github.com/mtxr/vscode-sqltools)


### Prerequisites
#### For 64-bit Oracle client libraries
* Have 64-bit Node.js (version 10 or newer) and npm installed
* Have the oracledb@5.5.0 (Normally, Upon first use the Oracle driver extension prompts for permission to install the oracledb@5.5.0 package).

#### For 32-bit Oracle client libraries
* Have 32-bit Node.js (version 10 or newer) and npm installed(nvm can be used to manage different nodejs versions)
* Have the oracledb@5.5.0(Because there is no prebuilt binaries corresponding to this platform, you need to install according to the [official instructions](https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#node-oracledb-installation-instructions)) in the specific directory(which is used for storing data for vscode-sqltools)(you can use everything to search "vscode-sqltools" to find the directory)
   * For me, I first download the [tgz File](https://github.com/oracle/node-oracledb/releases/download/v5.5.0/oracledb-src-5.5.0.tgz), then in the **\AppData\Local\vscode-sqltools\Data directory and run `npm install your_dir_path/oracledb-5.5.0.tgz`


### Installation
* From VS Code by searching SQLTools Oracle Driver
* From [marketplace](https://marketplace.visualstudio.com/items?itemName=hurly.sqltools-oracle-driver)
### 0.1.0
* First working version

### Feedback
* If you have any questions, feel free to ask and I'll get back to you at the weekend.

### PLANS
* Add more functions to vscode sqltools

Thanks to [vscode-sqltools](https://github.com/mtxr/vscode-sqltools), [node-oracledb](https://github.com/oracle/node-oracledb), [Older SQLTools oracle driver](https://github.com/mickeypearce/vscode-sqltools)