var async = require('async'),
    fs = require('fs'),
    SerialPort = require('serialport').SerialPort,
    sp,
    i_1 = true,
    i_6 = true,
    fileName,
    rawX = [],
    postScale,
    recNumber,
    array = [],
    dataArray = [],
    dataCount = 0,
    port = '';


// 引数チェック
if (process.argv.length < 3) {
    throw 'missing argument.';
}
// 引数の内容を受け取る
fileName = process.argv[2];
port = process.argv[3] || '/dev/ttyACM0';

sp = new SerialPort(port, { baudrate: 9600 });

async.waterfall([
    function (callback) {
        'use strict';
        sp.on('open', function () {
            console.log('open');

            sp.on('data', function (data) {
                if (!i_1 && !i_6) {
                    console.log('data >> ' + data);
                }
            });
            callback();
        });

    },
    function (callback) {
        'use strict';
        //if (i_1) {
            console.log('write i,1');
            sp.write('i,1\r\n', function () {
                //console.log('write i,1 callback');
                callback();
            });
        //}
    },
    function (callback) {
        'use strict';
        console.log('addListener data1');
        sp.once('data', function (dataI_1) {

            //if (i_1) {
                recNumber = parseInt(dataI_1, 16);
                console.log('data1 >>> ' + dataI_1);
                console.log('recNumber >>> ' + recNumber);
            //    i_1 = false;
                callback();
            //}
        });
    },
    function (callback) {
        'use strict';
        console.log('write i,6');
        //if (i_6) {
            //console.log('write i,6');
            sp.write('i,6\r\n', function () {
                //console.log('write i,6 callback');
                callback();
            });
        //}
    },
    function (callback) {
        'use strict';
        console.log('addListener data2');
        sp.once('data', function (dataI_6) {

            //if (i_6) {
                postScale = parseInt(dataI_6, 10);
                console.log('data2 >>> ' + dataI_6);
                console.log('postScale >>> ' + postScale);
            //    i_6 = false;
                //i_1 = true;
                callback();
            //}
        });
    },
    function (callback) {
        'use strict';
        var i;
        console.log('making array');
        for (i = 0; i < recNumber; i++) {
            array.push({
                bank: Math.floor(i / 64),
                pos: i % 64,
                judge: true
            });
        }
        //console.log(array);
        callback();
    },
    function (callback) {
        'use strict';
        async.each(array, function (n, eachCallback) {
            console.log(n);
            if (n.pos === 0) {
                console.log('writeing b,' + n.bank);
                sp.write('b,' + n.bank + '\r\n', function () {
                    sp.drain(function () {
                        if (n.judge) {
                            sp.write('d,' + n.pos + '\r\n', function () {
                                sp.once('data', function (data) {
                                    var index,
                                        Xdata;
                                    if (n.judge) {
                                        index = n.bank * 64 + n.pos;
                                        console.log('dataD,' + n.pos + ' >>> ' + data);
                                        if (data.length > 3) {//例 : '0a 27 27'
                                            if (dataCount === 0) {
                                                dataArray = data.split(' ');
                                            }
                                            Xdata = parseInt(dataArray[dataCount], 16);
                                            rawX[index] = Xdata;
                                            dataCount += 1;
                                            if (dataCount >= dataArray.length) {
                                                dataCount = 0;
                                            }
                                        } else {
                                            Xdata = parseInt(data, 16);
                                            rawX[index] = Xdata;
                                        }
                                        console.log('rawX[' + index + '] : ' + rawX[index] + '\n');
                                        n.judge = false;
                                        //console.log(n);
                                        eachCallback();
                                    }
                                });
                            });
                        }
                    });
                });
            } else {
                if (n.judge) {
                    sp.write('d,' + n.pos + '\r\n', function () {
                        sp.once('data', function (data) {
                            var index,
                                Xdata;
                            if (n.judge) {
                                index = n.bank * 64 + n.pos;
                                console.log('dataD,' + n.pos + ' >>> ' + data);
                                if (data.length > 3) {//例 : '0a 27 27'
                                    if (dataCount === 0) {
                                        data += '';//Object => String
                                        dataArray = data.split(' ');
                                    }
                                    Xdata = parseInt(dataArray[dataCount], 16);
                                    rawX[index] = Xdata;
                                    dataCount += 1;
                                    if (dataCount >= dataArray.length) {
                                        dataCount = 0;
                                    }
                                } else {
                                    Xdata = parseInt(data, 16);
                                    rawX[index] = Xdata;
                                }
                                console.log('rawX[' + index + '] : ' + rawX[index] + '\n');
                                n.judge = false;
                                //console.log(n);
                                eachCallback();
                            }
                        });
                    });
                }
            }

        }, function () {
            console.log('each all done.');
            callback();
        });
    }
], function () {
    'use strict';
    console.log(rawX);

    var jsonData = {
        postscale: postScale,
        freq: 38,
        data: rawX,
        format: 'raw'
    };

    fs.writeFileSync(fileName, JSON.stringify(jsonData));
    //fs.writeFileSync(fileName, JSON.stringify(jsonData, null, '    '));//見やすい?
    console.log('all done.');
    console.log('finish!');
    sp.close();
});
