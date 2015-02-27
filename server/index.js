var async = require('async');
var restify = require('restify');
var request = require('request');
var gramophone = require('gramophone');

var server = restify.createServer({
    name: 'history',
    version: '1.0.0'
});
server.use(restify.queryParser());
server.use(restify.CORS({
    origins: ['http://localhost:9090', 'http://localhost:7890']
}));
server.listen(8181, function () {
    console.log('%s listening at %s', server.name, server.url);
});


function getPerson (name, callback) {
    request('http://content.guardianapis.com/search?page-size=100&show-fields=body&section=politics&q=' + encodeURIComponent(name) + '&api-key=gnm-hackday', function (error, response, body) {
        if (error) {
            return callback(error);
        }
        try {
            body = JSON.parse(body);
        } catch (ex) {
            return callback(body);
        }
        if (body.response.status !== 'ok') {
            return callback(body);
        }
        var allKeys = {},
            result = {
                pageSize: body.response.pageSize,
                total: body.response.total,
                results: []
            };

        body.response.results.forEach(function (article) {
            if (article.fields) {
                var text = article.fields.body;
                var keys = gramophone.extract(text, {
                    score: true,
                    limit: 10,
                    html: true
                });

                keys = keys.filter(function (key) {
                    return key.tf > 2 && key.term.length > 1 && keepTerm(key.term);
                });

                var resultArticle = {
                    webTitle: article.webTitle,
                    webPublicationDate: article.webPublicationDate,
                    webUrl: article.webUrl,
                    keywords: keys
                };
                if (keys.length) {
                    result.results.push(resultArticle);
                }

                keys.forEach(function (key) {
                    if (!allKeys[key.term]) {
                        allKeys[key.term] = {
                            tf: 0,
                            articles: []
                        };
                    }
                    allKeys[key.term].tf += key.tf;
                    allKeys[key.term].articles.push(resultArticle);
                });
            }
        });

        mostPopular = Object.keys(allKeys).sort(function (one, two) {
            return allKeys[two].tf - allKeys[one].tf;
        }).slice(0, 50).map(function (key) {
            return {
                term: key,
                tf: allKeys[key].tf,
                articles: allKeys[key].articles
            };
        });

        result.mostPopularKeys = mostPopular;
        callback(null, result);
    });
}
server.get('mp/:name', function (req, res, next) {
    console.log('got a request for', req.params.name);
    getPerson(req.params.name, function (error, data) {
        next.ifError(error);
        res.send(data);
        next();
    });
});

var fs = require('fs');
var path = require('path');
var allData = {};
async.parallelLimit(allCandidates(), 6, function (err) {
    if (!err) {
        fs.writeFileSync(
            path.normalize(__dirname + '/../data/corpus.json'),
            JSON.stringify(allData)
        );
    }
    console.log('DONE');
});

function allCandidates () {
    // var mps = fs.readFileSync(path.normalize(__dirname + '/../politics/data/mps.json'));
    // mps = JSON.parse(mps.toString());
    var mps = [{
        name: 'David Cameron'
    }, {
        name: 'Edward Miliband'
    }, {
        name: 'Nick Clegg'
    }, {
        name: 'Nicola Sturgeon'
    }, {
        name: 'Nigel Farage'
    }, {
        name: 'Natalie Bennett'
    }, {
        name: 'Leann Wood'
    }];

    return mps.map(function (person) {
        return function (callback) {
            var name = person.name.toLowerCase();
            console.log('getting a person', name);
            getPerson(name, function (err, data) {
                if (!err) {
                    allData[name] = data;
                }
                callback(err, data);
            });
        };
    });
}

function keepTerm (term) {
    return ['mdash', 'quot', 'bst', 'cameron s', 'end', 'li', 'gmt', 'january', 'february',
        'march', 'april', 'may', 'june', 'july', 'august',
        'september', 'october', 'november', 'december'].indexOf(term.toLowerCase()) === -1;
}
