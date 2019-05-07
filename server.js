const config = require('./config.js');
const express = require('express');
const app = express();
const controller = require('./controllers.js');
const basicAuth = require('express-basic-auth');

app.use(require('body-parser').text({
    type: '*/*'
}));

if (config.auth_enabled) {
    app.use(basicAuth({
        users: config.users
    }));
}

// app.use(function(req, res, next) {
//     console.log(req);
//     next();
// });

app.post('/sys_properties.do', controller.handlePropertiesAction);
app.post('/sys_scope.do', controller.handleScopeAction);
app.post('/sys_update_set.do', controller.handleUpdateSetAction);
app.post('/sys_update_xml.do', controller.handleUpdateXMLAction);
app.get('/hub.do', controller.getHub);
app.get('*', controller.getUnknown);
app.post('*', controller.postUnknown);

app.listen(config.port, function() {
    console.log('App listening on port ' + config.port);
});