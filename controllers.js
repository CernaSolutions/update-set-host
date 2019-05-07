var builder = require('xmlbuilder');
var fs = require('fs');
var path = require('path');
var config = require('./config.js');
var glob = require("glob");
var path = require('path');
var xml2js = require('xml2js');

var standardHeaders = {
    'pragma': 'no-store,no-cache',
    'server': 'ServiceNow',
    'strict-transport-security': 'max-age=63072000; includeSubDomains',
    'x-is-logged-in': 'true'
};

var parser = new xml2js.Parser({
    explicitArray: false
});

/**
 * Logs an unknown request and body
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 */
function postUnknown(req, res) {
    console.log(req.method);
    console.log(req.url)
    console.log(req.headers);
    console.log(req.params);
    console.log(req.query);

    if (req.method.toUpperCase() == 'POST') {
        console.log(req.body);
    }
}

/**
 * Logs an unknown request
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 */
function getUnknown(req, res) {
    console.log(req.method);
    console.log(req.url)
    console.log(req.headers);
    console.log(req.params);
    console.log(req.query);
}

/**
 * Handle the Hub request
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     Object containing the Hub properties
 */
function getHub(req, res) {
    res.send({
        "com.snc.teamdev.requires_codereview": "false",
        "instance_id": config.instance_id,
        "instance_properties": "glide-jakarta-05-03-2017__patch6-11-14-2017_11-22-2017_2104.zip",
        "upgrade_system_busy": false
    });
}

/**
 * Handles Scope functions
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 */
function handleScopeAction(req, res) {
    if (req.headers.soapaction.indexOf('getKeys') !== -1) {
        outputScopeKeys(req, res);
    } else if (req.headers.soapaction == 'getRecords') {
        outputScopeRecords(req, res);
    }
}

function outputScopeKeys(req, res) {
    glob("scopes/*.xml", {
        realpath: true
    }, function(er, files) {
        files = files.map(function(file) {
            return path.basename(file, '.xml');
        });

        res.set(standardHeaders);
        res.send(formatKeysResponse(files));
    });
}

function outputScopeRecords(req, res) {
    parser.parseString(req.body, function(err, requestBody) {
        let scopeIds = getSysIdsFromQuery(requestBody);
        res.set(standardHeaders);
        res.send(formatRecordsResponse(getScopes(scopeIds)));
    });
}

function getScopes(scopeIds) {
    var responses = [];

    scopeIds.forEach(function(scopeId) {
        let fileName = './scopes/' + scopeId + '.xml'
        let fileContents = fs.readFileSync(fileName, 'utf-8');
        responses.push('<getRecordsResult>')
        responses.push(fileContents)
        responses.push('</getRecordsResult>')
    });

    return responses;
}

function handleUpdateSetAction(req, res) {
    if (req.headers.soapaction.indexOf('getKeys') !== -1) {
        outputUpdateSetKeys(req, res);
    } else if (req.headers.soapaction == 'getRecords') {
        outputUpdateSetRecords(req, res);
    }
}

function outputUpdateSetKeys(req, res) {
    glob("update_sets/*.xml", {
        realpath: true
    }, function(er, files) {
        files = files.map(function(file) {
            let xmlFile = path.basename(file);
            return xmlFile.match(/[a-f0-9]{32}/)[0];
        });

        res.set(standardHeaders);
        res.send(formatKeysResponse(files));
    })
}

function outputUpdateSetRecords(req, res) {
    parser.parseString(req.body, function(err, requestBody) {
        var updateSetIds = getSysIdsFromQuery(requestBody);

        res.set(standardHeaders);
        res.send(getRemoteUpdateSets(updateSetIds));
    });
}

function getRemoteUpdateSets(updateSetIds) {
    var responses = [];

    updateSetIds.forEach(function(updateSetId) {
        let fileName = './update_sets/sys_remote_update_set_' + updateSetId + '.xml'
        let fileContents = fs.readFileSync(fileName, 'utf-8');
        let start = fileContents.indexOf('<sys_remote_update_set action="INSERT_OR_UPDATE">');
        let end = fileContents.indexOf('</sys_remote_update_set>');
        let remoteUpdateSet = fileContents.substring(start + 49, end)
        responses.push('<getRecordsResult>')
        responses.push(remoteUpdateSet)
        responses.push('</getRecordsResult>')
    });

    return formatRecordsResponse(responses.join('\n'));
}

function handleUpdateXMLAction(req, res) {
    if (req.headers.soapaction == 'getKeys') {
        outputUpdateSetKey(req, res);
    } else if (req.headers.soapaction == 'getRecords') {
        outputXMLRecords(req, res);
    }
}

function outputUpdateSetKey(req, res) {
    parser.parseString(req.body, function(err, requestBody) {
        var updateSet = requestBody["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["getKeys"]["update_set"];
        res.set(standardHeaders);
        res.send(formatKeysResponse([updateSet]));
    });
}

function outputXMLRecords(req, res) {
    parser.parseString(req.body, function(err, requestBody) {
        var updateSetId = getSysIdsFromQuery(requestBody)[0];
        res.set(standardHeaders);
        res.send(getXMLRecord(updateSetId));
    });
}

function getXMLRecord(updateSetId) {
    var fileName = './update_sets/sys_remote_update_set_' + updateSetId + '.xml'
    var fileContents = fs.readFileSync(fileName, 'utf-8');
    var start = fileContents.indexOf('<sys_update_xml action="INSERT_OR_UPDATE">');
    var end = fileContents.lastIndexOf('</sys_update_xml>');
    var responses = fileContents.substring(start, end + 17);

    responses = responses.split('<sys_update_xml action="INSERT_OR_UPDATE">').join('<getRecordsResult>');
    responses = responses.split('</sys_update_xml>').join('</getRecordsResult>');

    return formatRecordsResponse(responses);
}

function handlePropertiesAction(req, res) {
    res.set(standardHeaders);
    res.send(formatKeysResponse(['deadbeefdeadbeefdeadbeefdeadbeef']));
}

function formatKeysResponse(keys) {
    var responseXMLObject = {
        'SOAP-ENV:Envelope': {
            '@xmlns:SOAP-ENV': 'http://schemas.xmlsoap.org/soap/envelope/',
            '@xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'SOAP-ENV:Body': {
                'getKeysResponse': {
                    'count': keys.length,
                    'sys_id': keys.join(',')
                }
            }
        }
    };

    var feed = builder.create(responseXMLObject, {
        encoding: 'utf-8'
    });

    var response = feed.end({
        pretty: true
    });

    return response;
}

function formatRecordsResponse(record) {
    var response = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
        '<SOAP-ENV:Body>',
        '<getRecordsResponse>',
        record,
        '</getRecordsResponse>',
        '</SOAP-ENV:Body>',
        '</SOAP-ENV:Envelope>'
    ];

    return response.join('\n');
}

function getSysIdsFromQuery(requestBody) {
    let encodedQuery = requestBody["SOAP-ENV:Envelope"]["SOAP-ENV:Body"]["getRecords"]["__encoded_query"];
    let regex = /([a-f0-9]{32})/g;
    let scopeIds = encodedQuery.match(regex);

    return scopeIds;
}

module.exports = {
    handlePropertiesAction: handlePropertiesAction,
    handleScopeAction: handleScopeAction,
    handleUpdateSetAction: handleUpdateSetAction,
    handleUpdateXMLAction: handleUpdateXMLAction,
    getHub: getHub,
    getUnknown: getUnknown,
    postUnknown: postUnknown
}