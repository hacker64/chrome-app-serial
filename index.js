$(function() {

	var connectedId = 0;

	function convertArrayBufferToString (buf) {
		return String.fromCharCode.apply(null, new Uint8Array(buf));
	}

	function convertArrayBufferToDumpString (buf) {
		var dumpString = '['
		var charArray = new Uint8Array(buf);
		for (var i = 0; i < charArray.length; i++) {
			dumpString += charArray[i].toString();
			if (i < charArray.length - 1) dumpString += ', ';
		}
		dumpString += ']';
		return dumpString;
	}

	function convertStringToArrayBuffer (str) {
		var buf = new ArrayBuffer(str.length);
		var bufView = new Uint8Array(buf);
		for (var i = 0; i < str.length; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

    function printCommLog(logmsg) {
    	var commLog = $('#commLog');
    	var commLogContent = $('#commLogContent');

		commLogContent.append(document.createTextNode(logmsg + '\n'));
		commLog.scrollTop(commLog[0].scrollHeight);
    }

	function printConnectionCommLog(id, msg) {
		printCommLog('(' + id + ') ' + msg);
	}

	$('#commPortScan')
		.click(function () {
            chrome.serial.getDevices(function (ports) {
                var commPortSelect = $('#commPortSelect');
                commPortSelect.empty();

                for (var i = 0; i < ports.length; i++) {
                    var commPortName = ports[i].path;
                    $('<option></option>').text(commPortName).appendTo(commPortSelect);
                }

                $('#selectedCommPort').val(commPortSelect.val());

                printCommLog('Scanned comm ports.');
            });
		});

	$('#commPortSelect')
		.change(function () {
			$('#selectedCommPort').val($('#commPortSelect').val());
		});

	$('#commConnect')
		.click(function () {
			var commPortName = $('#selectedCommPort').val();
			var bitrateValue = $('#bitrateValue').val();
			var bitrate = parseInt(bitrateValue);
			if (isNaN(bitrate)) {
				printCommLog('Bitrate specified is not a valid number.');
				return;				
			}

			if (!commPortName) {
				printCommLog('No comm port selected.');
				return;
			}
			if (!connectedId) {
				printCommLog('Connecting to ' + commPortName + '...');
				chrome.serial.connect(commPortName, { 'name' : commPortName, 'bitrate' : bitrate }, function (connectionInfo) {
					if (connectionInfo) {
						connectedId = connectionInfo.connectionId;
						printCommLog('Connected to ' + commPortName + '. Connection ID: ' + connectedId);
						$('#connectionId').text(connectedId);
						$('#connectionStatus').text("Connected");
					}
					else {
						printCommLog('Connection to ' + commPortName + ' returned no result: ' + connectionInfo);
					}
				});
			}
			else {
				printCommLog('Already connected.');
			}
		});

	$('#commDisconnect')
		.click(function () {
			if (connectedId) {
				printCommLog('Disconnecting connection id ' + connectedId + '...');
				chrome.serial.disconnect(connectedId, function (result) {
					connectedId = 0;
					printCommLog('Disconnect successful: ' + result);
					$('#connectionId').text(connectedId);
					$('#connectionStatus').text("Disconnected");
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});


	$('#commPause')
		.click(function () {
			if (connectedId) {
				printConnectionCommLog(connectedId, 'Pausing...');
				chrome.serial.setPaused(connectedId, true, function () {
					printConnectionCommLog(connectedId, 'Connection paused.');
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});

	$('#commUnpause')
		.click(function () {
			if (connectedId) {
				printConnectionCommLog(connectedId, 'Unpausing...');
				chrome.serial.setPaused(connectedId, false, function () {
					printConnectionCommLog(connectedId, 'Connection unpaused.');
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});

	$('#commFlush')
		.click(function () {
			if (connectedId) {
				printConnectionCommLog(connectedId, 'Flush...');
				chrome.serial.flush(connectedId, function (result) {
					if (result) {
						printConnectionCommLog(connectedId, 'Buffer flushed successfully.');
					}
					else {
						printConnectionCommLog(connectedId, 'Failed to flush buffer.');
					}
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});

	$('#commSetSendTimeout')
		.click(function () {
			var sendTimeoutValue = $('#sendTimeoutValue').val();
			var sendTimeout = parseInt(sendTimeoutValue);
			if (isNaN(sendTimeout)) {
				printCommLog('Send timeout specified is not valid.');
				return;				
			}
			if (connectedId) {
				printConnectionCommLog(connectedId, 'Setting send timeout value to ' + sendTimeout + '...');
				chrome.serial.update(connectedId, { 'sendTimeout': sendTimeout }, function (result) {
					if (result) {
						printConnectionCommLog(connectedId, 'Send timeout set successfully.');
					}
					else {
						printConnectionCommLog(connectedId, 'Failed to set send timeout.');
					}
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});

	$('#commSetReceiveTimeout')
		.click(function () {
			var receiveTimeoutValue = $('#receiveTimeoutValue').val();
			var receiveTimeout = parseInt(receiveTimeoutValue);
			if (isNaN(receiveTimeout)) {
				printCommLog('Receive timeout specified is not valid.');
				return;				
			}
			if (connectedId) {
				printConnectionCommLog(connectedId, 'Setting receive timeout value to ' + receiveTimeout + '...');
				chrome.serial.update(connectedId, { 'receiveTimeout': receiveTimeout }, function (result) {
					if (result) {
						printConnectionCommLog(connectedId, 'Receive timeout set successfully.');
					}
					else {
						printConnectionCommLog(connectedId, 'Failed to set receive timeout.');
					}
				});
			}
			else {
				printCommLog('Not connected.');
			}
		});

	$('#commSendMessage')
		.click(function () {
			if (connectedId) {
				var txdata = $('#sendMessageContent').val();
				printConnectionCommLog(connectedId, '>> Sending message: "' + txdata + '"');
				var txstring = txdata + '\r';
				var txbuffer = convertStringToArrayBuffer(txstring);

				chrome.serial.send(connectedId, txbuffer, function (info) {
					if (!info.error) {
						printConnectionCommLog(connectedId, 'Sent ' + info.bytesSent + ' out of ' + txbuffer.byteLength + ' bytes of data.');
					}
					else {
						printConnectionCommLog(connectedId, 'Error sending data, sent ' + info.bytesSent + ' out of ' + txbuffer.byteLength + ' bytes. Error: ' + info.error);
					}
				});
			}
			else {
				printCommLog('Not connected.');
			}			
		});

	var rxbuilder = '';
	function onSerialReceive(info) {
		printConnectionCommLog(info.connectionId, 'Received ' + info.data.byteLength + ' bytes of data: ' + convertArrayBufferToDumpString(info.data));
		var rxstring = convertArrayBufferToString(info.data);
		rxbuilder += rxstring;
		if (rxbuilder.charCodeAt(rxbuilder.length - 1) == 13) {
			var rxdata = rxbuilder.slice(0, -1);
			printConnectionCommLog(info.connectionId, '<< Received message: "' + rxdata + '"');
			rxbuilder = '';
		}
		else {
			printConnectionCommLog(info.connectionId, 'Message is not terminated. Message so far is: "' + rxbuilder + '"');
		}
	}

	function onSerialReceiveError(info) {
		printConnectionCommLog(info.connectionId, 'Receive error:  ' + info.error);
	}

	chrome.serial.onReceive.addListener(onSerialReceive);
	chrome.serial.onReceiveError.addListener(onSerialReceiveError);

});