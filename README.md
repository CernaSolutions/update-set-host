## Installation
- Run `npm install`

## Adding Scopes
- Clone the 'global.xml' file in scopes and name it the sys_id of the scope you want to add
- Edit the details of the XML file to match that of the scope you want to add

## Adding Update Sets
- Copy Update Set to the 'update_sets' folder (create this folder if it does not exist)
- File must be named in format 'sys_remote_update_set_SYSID.xml'

## Enabling Authentication
- Set `enable_auth` to true in 'config.js'
- Add users as key/value pairs in 'config.js'
	- Example `'user': 'password'`
