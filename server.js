(function () {

var fs      = require('fs');
var path    = require('path');
var app     = require('http').createServer(handler);
// module
var mkdirp  = require('mkdirp');
var cheerio = require("cheerio");
var io      = require('socket.io').listen(app);
var JS_PATH = '/output/test.js';

// port設定
app.listen(9124);

// 接続時のコールバック
function handler (req, res) {
    fs.readFile(__dirname + '/output/result.html', function (err, data) {
        var urlinfo = require('url').parse(req.url, true);

        if (err) {
            res.writeHead(500);
            return res.end('Error loading');
        }

        // router
        if (urlinfo.pathname === JS_PATH) {
            res.writeHead(200, {
                'Content-Type' : 'application/javascript'
            });

            fs.createReadStream(__dirname + JS_PATH).addListener('data', function (chunk) {
                res.end(chunk)
            });
        } else {
            res.writeHead(200, {
                'Content-Type' : 'text/html'
            });

            res.end(data);
        }

    });
}

//
io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});

return;

// ファイルを別名でコピーする関数
var createClone = function (srcFile, dstFile, dirName, callback) {
    var filePath = dirName + dstFile;
    var oldFile, newFile;

    // dir生成
    mkdirp(dirName, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('success');
        }
    });

    // fileの存在確認
    if(path.existsSync(srcFile) && fs.statSync(srcFile).isFile()) {
        oldFile = fs.createReadStream(srcFile);
        newFile = fs.createWriteStream(filePath);

        oldFile.addListener('data', function(chunk) {
            newFile.write(chunk);
        });

        oldFile.addListener('close', function() {
            newFile.end();

            if(callback) {
                callback(filePath);
            }
        });
    } else {
        throw 'not found a file : ' + srcFile;
    }
};


return;

// test code phase

createClone('index.html', 'output.html', './output/', function (fp) {
    var newFileStr = fs.readFileSync(fp).toString();
    var _resultFile = fs.readFileSync('./output/result.html');
    var resultFile = fs.createWriteStream('./output/result.html');
    var resStr = _resultFile.toString();
    // DOM生成
    var clone$ = cheerio.load(newFileStr, {
        ignoreWhitespace : true
    });
    var res$ = cheerio.load(resStr);


    // エラー情報
    var errorCount = {
        _all        : 0,
        _img        : 0,
        _link       : 0,
        _text       : 0,
        _other      : 0,
        _notice     : 0
    };

    // resultページへ結果を挿入
    createTextChecker();

    // console.log(res$('html').html())

    resultFile.write('<!DOCTYPE html><html lang="ja">' + res$('html').html() + '</html>');

    //--------------------------------------------------------
    // テキスト解析
    //--------------------------------------------------------
    function createTextChecker () {
        var tags = getText(clone$('body'));
        res$('#ac_text_list').empty().append(tags.join(''));

        // テキストノード全取得
        function getText(root) {
            var res = [];
            var searchText = function (el) {
                var i = 0;
                var elChildren, len, _el;
                // targetとなる要素のタイプを判別
                if (el.type === 'text') {
                    res.push('<li>'+ el.parent.name + ':' + el.data.replace(/\n|\r/g, '') +'</li>')
                }

                elChildren = el.children;

                // 子要素を持たない場合は検索の必要がないので次へ。
                if (!elChildren) {
                    return;
                }

                len = elChildren.length;

                for (; i < len; i++) {
                    _el = elChildren[i];

                    if (el.type === 'tag') {
                        searchText(_el);
                    }
                }
            };

            searchText(root[0]);

            return res;
        }
    }
});

}());