var vConsole; // 感谢来自 Tencent 前端开源组的 vConsole 调试工具

// 此处声明在文档中的 DOM 元素
var searchKwdDom = document.getElementById('searchKwd'); // 搜索框
var resultDiv = document.getElementById('resultDiv'); // 搜索结果 Div
var dialogDiv = document.getElementById('info_dialog'); // 详细信息对话框 Div
var recoMenuDiv = document.getElementById('search_recommend'); // 搜索推荐菜单 Div
var recoMenuInst = new mdui.Menu('#search', recoMenuDiv, {align:'left', position:'bottom'}); // 搜索推荐菜单 MDUI 元素
var menuPosi = document.getElementById('search'); // 搜索推荐菜单定位元素
var aplayer; // APlayer 播放器用的变量，备用
var aplayerDom; // APlayer 播放器的 DOM 元素，备用
var colorThief = new ColorThief(); // Color Thief 工具类，用于获取专辑封面主题色
var coverImage = new Image; // 专辑封面图

// 此处声明全局变量
var searchKwd = ''; // 真搜索关键词
var currentPage = 1; // 当前页码


// 此处声明事件监听
searchKwdDom.addEventListener('keydown', function(e) { // 监听编辑框按键事件
	if (e.keyCode == 13) {
		searchSong() // 如果按键是回车，则搜索
		recoMenuInst.close(); // 关闭搜索推荐菜单
	}
});

searchKwdDom.addEventListener('blur', function(e) { // 监听搜索框失去焦点事件
	recoMenuInst.close(); // 关闭搜索推荐菜单
});

window.onresize = function(e) { // 浏览器窗口改变，则重新定位搜索推荐菜单位置与宽度
	// menuPosi.style.top = searchKwdDom.getBoundingClientRect().bottom + 'px';
	menuPosi.style.width = mdui.$(searchKwdDom).width() + 'px';
	menuPosi.style.left = (searchKwdDom.getBoundingClientRect().left -
		document.getElementById('container').getBoundingClientRect().left - 8) + 'px';
};

coverImage.onload = function() { // 当专辑封面图加载完毕
	if (aplayer) { // 如果加载了播放器
		const color = colorThief.getColor(coverImage); // 使用 Color Thief 获取封面主色
		aplayer.theme(`rgb(${color[0]}, ${color[1]}, ${color[2]})`); // 设置播放器的主题色
	}
};

// 此处开始执行初始化程序
// MDUI Ajax 方法全局配置
mdui.$.ajaxSetup({
	method: 'POST'
});

// MDUI Ajax 方法全局 Start 事件
mdui.$(document).ajaxStart(function() {
	mdui.$('#mdui_loading').removeClass('mdui-hidden');
	mdui.$.showOverlay();
});

// MDUI Ajax 方法全局 Complete 事件
mdui.$(document).ajaxComplete(function() {
	mdui.$('#mdui_loading').addClass('mdui-hidden');
	mdui.$.hideOverlay();
});

// MDUI Ajax 方法全局 Error 事件
mdui.$(document).ajaxError(function() {
	mdui.alert('拉取信息失败！', '提示');
});

// 定位搜索推荐菜单位置与宽度
menuPosi.style.left = (searchKwdDom.getBoundingClientRect().left -
	document.getElementById('container').getBoundingClientRect().left - 8) + 'px';
menuPosi.style.top = (searchKwdDom.getBoundingClientRect().bottom -
	document.getElementById('searchBox').getBoundingClientRect().top) + 'px';
menuPosi.style.width = mdui.$(searchKwdDom).width() + 'px';

coverImage.crossOrigin = 'anonymous'; // 防跨域图片报错


// 此处声明主程序
function searchSong() { // 搜索音乐 主程序
	searchKwdDom.blur(); // 先让编辑框失去焦点
	searchKwd = searchKwdDom.value; // 将编辑框的内容提取出来
	
	if (searchKwd == '') { // 关键词为空，直接提示，并给编辑框上焦点
		mdui.alert('搜索关键词不能为空！', '警告', function() {
			searchKwdDom.focus()
		});
		return
	}
	
	// 向服务器发起搜索请求
	searchKey(searchKwd, true);
}

function playSong(songId, fee = 0) { // 播放音乐
	if (fee == 1) {
		mdui.confirm('您正在尝试播放的歌曲可能不被网易云允许直接播放<br>是否强行尝试播放？', '警告',
			function() {
				playSong(songId);
			},
			function() {},
			{
				confirmText: '强行尝试'
			});
		return;
	}
	
	// 显示加载进度条
	mdui.$('#mdui_loading').removeClass('mdui-hidden');
	
	mdui.$.ajax({
		global : false, // 不使用全局方法的理由是没有必要
		method : 'GET',
		url : 'https://api.yimian.xyz/msc/', // 感谢这个接口
		data : {
			type : 'single',
			id : songId
		},
		complete : function() { // 当音乐信息被加载完成时移除加载进度条
			mdui.$('#mdui_loading').addClass('mdui-hidden');
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				
				if (obj) { // 如果成功地获取了歌曲信息
					if (!aplayer) { // 判断，如果之前没有创建播放器
						// 创建播放器容器
						aplayerDom = document.createElement('div');
						aplayerDom.setAttribute('id', 'aplayer');
						document.getElementsByTagName('body')[0].appendChild(aplayerDom);
						
						aplayer = new APlayer({ // 创建 APlayer 播放器
							container : aplayerDom,
							lrcType : 3,
							fixed : true,
							audio : [{
								name : obj.name,
								artist : obj.artist,
								url : obj.url,
								cover : obj.cover,
								lrc : obj.lrc
							}]
						});
						
						aplayer.on('listswitch', function(obj) {
							coverImage.src = aplayer.list.audios[obj.index].cover;
						});
						
						aplayer.audio.onerror = function() {
							mdui.snackbar({
								message: '加载音频时出错',
								buttonText: '重试',
								onButtonClick: function() {
									playSong(songId);
								}
							});
						};
						
						mdui.$('#aplayer').css('color', '#000');
						
					} else if (aplayer.list.audios.length > 1) {
						var isFindSong = false;
						for (var x = 0; x < aplayer.list.audios.length; x++) {
							if (aplayer.list.audios[x].url == obj.url) {
								aplayer.list.switch(x);
								isFindSong = true;
								break;
							}
						}
						
						if (!isFindSong) {
							aplayer.list.add({
								name : obj.name,
								artist : obj.artist,
								url : obj.url,
								cover : obj.cover,
								lrc : obj.lrc
							});
							aplayer.list.switch(aplayer.list.audios.length - 1);
						}
					} else { // 移除正在播放的乐曲，以现在指定乐曲代替
						aplayer.pause();
						
						aplayer.list.remove(0);
						aplayer.list.add({
							name : obj.name,
							artist : obj.artist,
							url : obj.url,
							cover : obj.cover,
							lrc : obj.lrc
						});
					}
					
					coverImage.src = obj.cover; // 加载专辑封面
					
					aplayer.play(); // 并播放
					
				} else { // 不然就弹窗提示
					mdui.alert('拉取音乐数据失败！', '提示');
				}
			}
		},
		error : function() { // 不然就弹窗提示x2
			mdui.alert('拉取音乐数据失败！', '提示');
		}
	});
}

function songAddList(songId, fee = 0) { // 添加歌曲到播放列表
	if (fee == 1) {
		mdui.confirm('您正在尝试播放的歌曲可能不被网易云允许直接播放<br>是否强行尝试播放？', '警告',
			function() {
				songAddList(songId);
			},
			function() {},
			{
				confirmText: '强行尝试'
			});
		return;
	}
	
	// 显示加载进度条
	mdui.$('#mdui_loading').removeClass('mdui-hidden');
	
	mdui.$.ajax({
		global : false, // 不使用全局方法的理由是没有必要
		method : 'GET',
		url : 'https://api.yimian.xyz/msc/', // 感谢这个接口
		data : {
			type : 'single',
			id : songId
		},
		complete : function() { // 当音乐信息被加载完成时移除加载进度条
			mdui.$('#mdui_loading').addClass('mdui-hidden');
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				
				if (obj) { // 如果成功地获取了歌曲信息
					if (!aplayer) { // 判断，如果之前没有创建播放器
						// 创建播放器容器
						aplayerDom = document.createElement('div');
						aplayerDom.setAttribute('id', 'aplayer');
						document.getElementsByTagName('body')[0].appendChild(aplayerDom);
						
						aplayer = new APlayer({ // 创建 APlayer 播放器
							container : aplayerDom,
							lrcType : 3,
							fixed : true,
							audio : [{
								name : obj.name,
								artist : obj.artist,
								url : obj.url,
								cover : obj.cover,
								lrc : obj.lrc
							}]
						});
						
						aplayer.on('listswitch', function(obj) {
							coverImage.src = aplayer.list.audios[obj.index].cover;
						});
						
						aplayer.audio.onerror = function() {
							mdui.snackbar({
								message: '加载音频时出错',
								buttonText: '重试',
								onButtonClick: function() {
									playSong(songId);
								}
							});
						};
						
						mdui.$('#aplayer').css('color', '#000');
						
						coverImage.src = obj.cover;
						
						aplayer.play();
						
					} else if (aplayer.list.audios.length >= 1) {
						var isFindSong = false;
						for (var x = 0; x < aplayer.list.audios.length; x++) {
							if (aplayer.list.audios[x].url == obj.url) {
								mdui.snackbar({
									message:' 已在播放列表中',
									buttonText: '移除该曲目',
									onButtonClick: function() {
										aplayer.list.remove(x);
										mdui.snackbar({
											message: '移除成功'
										});
									}
								});
								isFindSong = true;
								break;
							}
						}
						
						if (!isFindSong) {
							aplayer.list.add({
								name : obj.name,
								artist : obj.artist,
								url : obj.url,
								cover : obj.cover,
								lrc : obj.lrc
							});
							
							mdui.snackbar({
								message: '添加到列表成功',
								buttonText: '撤销',
								onButtonClick: function() {
									aplayer.list.remove(aplayer.list.audios.length - 1);
									mdui.snackbar({
										message: '已撤销操作'
									});
								}
							});
						}
					} else { // 添加乐曲到播放器列表
						aplayer.list.add({
							name : obj.name,
							artist : obj.artist,
							url : obj.url,
							cover : obj.cover,
							lrc : obj.lrc
						});
						
						mdui.snackbar({
							message: '添加到列表成功',
							buttonText: '撤销',
							onButtonClick: function() {
								aplayer.list.remove(aplayer.list.audios.length - 1);
								mdui.snackbar({
									message: '已撤销操作'
								});
							}
						});
					}
				} else { // 不然就弹窗提示
					mdui.alert('拉取音乐数据失败！', '提示');
				}
			}
		},
		error : function() { // 不然就弹窗提示x2
			mdui.alert('拉取音乐数据失败！', '提示');
		}
	});
}

function songDownload(songId, fee = 0) { // 下载音乐
	if (fee == 1) {
		mdui.confirm('您正在尝试下载的歌曲可能不被网易云允许直接下载<br>是否强行尝试下载？', '警告',
			function() {
				songDownload(songId);
			},
			function() {},
			{
				confirmText: '强行尝试'
			});
		return;
	}
	
	mdui.snackbar({message:'正在跳转...'}); // 先弹一个 Snackbar
	
	// 显示加载进度条
	mdui.$('#mdui_loading').removeClass('mdui-hidden');
	
	mdui.$.ajax({ // 拉取歌曲信息
		global : false,
		method : 'GET',
		url : 'https://api.yimian.xyz/msc/',
		data : {
			type : 'single',
			id : songId
		},
		complete : function() {
			mdui.$('#mdui_loading').addClass('mdui-hidden');
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				if (obj.id) { // 如果获取了音乐信息，就创建一个用于下载的 a 标签
					var download = document.createElement('a');
					download.style.display = 'none';
					download.href = obj.url;
					download.download = obj.artist + ' - ' + obj.name + '.mp3';
					download.target = '_blank';
					document.getElementsByTagName('body')[0].appendChild(download);
					download.click();
					download.remove();
				} else {
					mdui.alert('拉取音乐数据失败！', '提示');
				}
			}
		},
		error : function() {
			mdui.alert('拉取音乐数据失败！', '提示');
		}
	});
}

function songInfo(songId) { // 获取歌曲信息
	mdui.$.ajax({
		url : './get.php',
		data : {
			mod : 2,
			songid : songId
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				var result = '';
				
				if (obj.code == 200 && obj.result) {
					result = '<div class="mdui-dialog-content mdui-typo">' +
						'<div class="mdui-dialog-title">详细信息 - ' + obj.result.name + '</div>' +
						'<div class="mdui-row" style="margin:0">' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'<img src="' + obj.result.al.picUrl +  '" class="album-pic" />' +
						'</div>' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'曲名：' + obj.result.name + '<br>' +
						'别称：';
					if (obj.result.alia.length > 0) {
						for (var x = 0; x < obj.result.alia.length; x++) {
							result += obj.result.alia[x];
							result += x + 1 < obj.result.alia.length ? '/' : '';
						}
					} else {
						result += '无';
					}
					result += '<br>' + '艺术家：';
					for (var y = 0; y < obj.result.ar.length; y++) {
						result += '<a href="javascript:artistInfo(' + obj.result.ar[y].id + ');" mdui-dialog-close>' +
							obj.result.ar[y].name + '</a>';
						result += y + 1 < obj.result.ar.length ? ' / ' : '';
					}
					result += '<br>';
					result += '专辑：<a href="javascript:albumInfo(' + obj.result.al.id.toString();
					result += ');" mdui-dialog-close>' + obj.result.al.name + '</a>';
					result += '</div><div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">';
					result += '歌曲时长：';
					{
						let min = Math.floor(obj.result.dt / 60000);
						let sec = Math.round((obj.result.dt - min * 60000) / 1000).toString();
						
						while (sec.length < 2) {
							sec = '0' + sec;
						}
						
						result += min.toString() + ':' + sec + '<br>';
					}
					result += '最大音质：';
					{
						let maxbr = Math.floor(obj.result.privilege.maxbr / 10000);
						
						if (maxbr > 32) {
							result += '无损';
						} else if (19 < maxbr <= 32) {
							result += '极高';
						} else if (12 < maxbr <= 19) {
							result += '较高';
						} else if (maxbr <= 12) {
							result += '普通';
						} else {
							result += '未知';
						}
						result += '音质';
					}
					result += '<br>有无版权：';
					result += obj.result.copyright == 1 ? '有' : '无';
					result += '<br>是否收费：';
					{
						var fee = obj.result.fee;
						if (fee < 1) {
							result += '不收费';
						} else if (fee >= 1) {
							result += '收费';
						} else {
							result += '未知';
						}
						
						result += '<br>可否免费播放：';
						if (fee == 1) {
							result += '不可';
						} else if (fee != 1) {
							result += '可';
						} else {
							result += '未知';
						}
					}
					result += '<br>有无 MV：';
					result += obj.result.mv > 0 ? '<a href="https://music.163.com/mv/' + obj.result.mv + '" target="_blank">有（' + obj.result.mv.toString() + '）</a>' : '无';
					result += '</div></div></div>';
					result += '<div class="mdui-dialog-actions" style="border-style:solid none none none;border-color:rgba(0,0,0,0.25);border-width:1px">';
					result += '<button onclick="javaecript:playSong(' + songId + ', ' + obj.result.fee  + ');" class="mdui-btn mdui-ripple mdui-float-left" mdui-dialog-close>立即播放</button>';
					result += '<button onclick="javaecript:songAddList(' + songId + ', ' + obj.result.fee  + ');" class="mdui-btn mdui-ripple mdui-float-left" mdui-dialog-close>加入到列表</button>';
					result += '<button class="mdui-btn mdui-ripple" mdui-dialog-close>OK</button>';
					result += '</div></div>';
					result += '<style>.album-pic{width:220px;height:auto;float:right;margin-right:4px}@media(max-width:600px){.album-pic{width:100%;float:none;margin:0 0 4px 0}}</style>';
					
					dialogDiv.innerHTML = result;
					mdui.$('#info_dialog').mutation(); // Div 内组件初始化
					
					let dialog = new mdui.Dialog('#info_dialog');
					dialog.open();
					
				} else if (obj.code == 404) {
					mdui.alert('没有该歌曲的信息', '提示');
				} else {
					mdui.alert('拉取歌曲信息时出错<br><br>' + 
						'错误代码：' + obj.code + '<br>错误信息：' + obj.msg, '出错啦！');
					
				}
			}
		}
	});
}

function artistInfo(artistId) { // 获取艺术家信息
	mdui.$.ajax({
		url : './get.php',
		data : {
			mod : 3,
			artistid : artistId
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				var result = '';
				
				if (obj.code == 200 && obj.result) {
					result = '<div class="mdui-dialog-content mdui-typo">' +
						'<div class="mdui-dialog-title">详细信息 - ' + obj.result.name + '</div>' +
						'<div class="mdui-row" style="margin:0">' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'<img src="' + obj.result.picUrl +  '" class="album-pic" />' +
						'</div>' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'名称：' + obj.result.name;
					result += obj.result.trans && obj.result.trans != '' ? '（' + obj.result.trans + '）' : '';
					result += '<br>' +
						'别称：';
					if (obj.result.alias.length > 0) {
						for (var x = 0; x < obj.result.alias.length; x++) {
							result += obj.result.alias[x];
							result += x + 1 < obj.result.alias.length ? '/' : '';
						}
					} else {
						result += '无';
					}
					result += '<br>';
					result += '曲目数量：' + obj.result.musicSize + ' 个<br>';
					result += '专辑数量：' + obj.result.albumSize + ' 个<br>';
					result += 'MV 数量：' + obj.result.mvSize + ' 个';
					result += '</div>';
					result += '<div class="mdui-col-xs-12" style="padding:4px 0 0 0">';
					result += '歌手简介：';
					result += obj.result.briefDesc != '' ? obj.result.briefDesc.replace(/\n/, '<br>') : '无';
					result += '<br>';
					result += '<p style="padding-top:4px;">热门 Top 5 作品：<br>';
					if (obj.result.hotSongs.length > 0) {
						for (var y = 0; y < obj.result.hotSongs.length; y++) {
							result += '&nbsp;&nbsp;' + (y + 1) + '.';
							result += '<a href="javascript:songInfo(' + obj.result.hotSongs[y].id + ');" mdui-dialog-close>';
							result += obj.result.hotSongs[y].name + '</a><br>';
						}
					}
					result += '</p>';
					result += '</div></div></div>';
					result += '<div class="mdui-dialog-actions" style="border-style:solid none none none;border-color:rgba(0,0,0,0.25);border-width:1px">';
					result += '<button onclick="searchKey(' + artistId + ')" class="mdui-btn mdui-ripple mdui-float-left" mdui-dialog-close>TA 的全部作品</button>';
					result += '<button class="mdui-btn mdui-ripple" mdui-dialog-close>OK</button>';
					result += '</div></div>';
					result += '<style>.album-pic{height:110px;width:auto;float:right;margin-right:4px}@media(max-width:600px){.album-pic{width:100%;height:auto;float:none;margin:0 0 4px 0}}</style>';
					
					dialogDiv.innerHTML = result;
					mdui.$('#info_dialog').mutation(); // Div 内组件初始化
					
					let dialog = new mdui.Dialog('#info_dialog');
					dialog.open();
					
				} else if (obj.code == 404) {
					mdui.alert('没有该歌手的信息', '提示');
					
				} else {
					mdui.alert('拉取歌手信息时出错<br><br>' + 
						'错误代码：' + obj.code + '<br>错误信息：' + obj.msg, '出错啦！');
					
				}
			}
		}
	});
}

function albumInfo(albumId) { // 获取专辑信息
	mdui.$.ajax({
		url : './get.php',
		data : {
			mod : 4,
			albumid : albumId
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				var result = '';
				
				if (obj.code == 200 && obj.result) {
					result = '<div class="mdui-dialog-content mdui-typo">' +
						'<div class="mdui-dialog-title">详细信息 - ' + obj.result.name + '</div>' +
						'<div class="mdui-row" style="margin:0">' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'<img src="' + obj.result.picUrl +  '" class="album-pic" />' +
						'</div>' +
						'<div class="mdui-col-xs-12 mdui-col-sm-6" style="padding:0">' +
						'名称：' + obj.result.name;
					result += obj.result.trans && obj.result.trans != '' ? '（' + obj.result.trans + '）' : '';
					result += '<br>' +
						'别称：';
					if (obj.result.alias.length > 0) {
						for (var x = 0; x < obj.result.alias.length; x++) {
							result += obj.result.alias[x];
							result += x + 1 < obj.result.alias.length ? '/' : '';
						}
					} else {
						result += '无';
					}
					result += '<br>';
					result += '艺术家：';
					for (var i = 0; i < obj.result.artists.length; i++) {
						result += '<a href="javascript:artistInfo(' + obj.result.artists[i].id + ');" mdui-dialog-close>';
						result += obj.result.artists[i].name + '</a>';
						result += i + 1 < obj.result.artists.length ? ' / ' : '';
					}
					result += '<br>';
					result += '发行商：';
					result += obj.result.company ? obj.result.company : '无';
					result += '<br>';
					result += '曲目数量：' + obj.result.size + ' 个<br>';
					result += '评论数量：' + obj.result.info.commentCount + ' 个<br>';
					result += '喜欢次数：' + obj.result.info.likedCount + ' 次<br>';
					result += '分享次数：' + obj.result.info.shareCount + ' 次';
					result += '</div>';
					result += '<div class="mdui-col-xs-12" style="padding:4px 0 0 0">';
					result += '专辑介绍：';
					result += obj.result.description ? obj.result.description.replace(/\n/, '<br>') : '无';
					result += '<br>';
					result += '<p style="padding-top:4px;">此专辑包含的歌曲：</p>';
					if (obj.result.size > 0) {
						result += '<div class="mdui-table-fluid">';
						result += '<table class="mdui-table">';
						result += '<thead>';
						result += '<tr>';
						result += '<th>#</th>';
						result += '<th>歌曲名</th>';
						result += '<th>艺术家</th>';
						result += '<th>操作</th>';
						result += '</tr>';
						result += '</thead>';
						result += '<tbody>';
						
						for (var y = 0; y < obj.result.size; y++) {
							result += '<tr>';
							result += '<td nowrap>' + obj.result.songs[y].no + '</td>';
							result += '<td class="mdui-typo" nowrap><a href="javascript:songAddList(' + obj.result.songs[y].id  + ', ' + obj.result.songs[y].fee + ');"';
							result += obj.result.songs[y].fee == 1 ? ' mdui-dialog-close>' : '>';
							result += obj.result.songs[y].name + '</a></td>';
							result += '<td class="mdui-typo" nowrap>';
							
							for (var z = 0; z < obj.result.songs[y].artists.length; z++) {
								result += '<a href="javascript:artistInfo(' + obj.result.songs[y].artists[z].id + ');" mdui-dialog-close>';
								result += obj.result.songs[y].artists[z].name + '</a>';
								result += z + 1 < obj.result.songs[y].artists.length ? ' / ' : '';
							}
							
							result += '</td>';
							result += '<td class="mdui-typo" nowrap>';
							result += '<a href="javascript:playSong(' + obj.result.songs[y].id + ', ' + obj.result.songs[y].fee + ');" mdui-dialog-close>立即播放</a>&nbsp;&nbsp;';
							result += '<a href="javascript:songAddList(' + obj.result.songs[y].id + ', ' + obj.result.songs[y].fee + ');" mdui-dialog-close>添加到列表</a>&nbsp;&nbsp;';
							result += '<a href="javascript:songDownload(' + obj.result.songs[y].id + ', ' + obj.result.songs[y].fee + ');" mdui-dialog-close>下载</a>&nbsp;&nbsp;';
							result += '<a href="javascript:songInfo(' + obj.result.songs[y].id + ');" mdui-dialog-close>详情</a>';
							result += '</td>';
							result += '</tr>';
						}
						
						result += '</tbody></table></div>';
					}
					result += '</div></div></div>';
					result += '<div class="mdui-dialog-actions" style="border-style:solid none none none;border-color:rgba(0,0,0,0.25);border-width:1px">';
					result += '<button class="mdui-btn mdui-ripple" mdui-dialog-close>OK</button>';
					result += '</div></div>';
					result += '<style>.album-pic{height:180px;width:auto;float:right;margin-right:4px}@media(max-width:600px){.album-pic{width:100%;height:auto;float:none;margin:0 0 4px 0}}</style>';
					
					dialogDiv.innerHTML = result;
					mdui.$('#info_dialog').mutation(); // Div 内组件初始化
					
					let dialog = new mdui.Dialog('#info_dialog');
					dialog.open();
					
				} else if (obj.code == 404) {
					mdui.alert('没有该专辑的信息', '提示');
				} else {
					mdui.alert('拉取专辑信息时出错<br><br>' + 
						'错误代码：' + obj.code + '<br>错误信息：' + obj.msg, '出错啦！');
					
				}
			}
		}
	});
}

function jumpPage(page) { // 跳转页码 aka 获取音乐列表
	mdui.$.ajax({
		method: 'POST',
		url : './get.php',
		data : {
			mod : 1,
			page : page,
			s : searchKwd
		},
		success : function(data, textStatus, xhr) {
			if (data != '') {
				var obj;
				try {
					obj = JSON.parse(data);
				} catch(e) {
					mdui.alert('获取数据失败！', '出错啦！');
					return;
				}
				
				var result = '';
				
				if (obj.code == 200 && obj.result) {
					result = '<div class="mdui-table-fluid">' +
						'<table class="mdui-table">' +
						'<thead>' +
						'<tr>' +
						'<th>#</th>' +
						'<th>歌曲名</th>' +
						'<th>艺术家</th>' +
						'<th>专辑</th>' +
						'<th>操作</th>' +
						'</tr>' +
						'</thead>' +
						'<tbody>';
					for (var i = 0; i < obj.result.length; i++) {
						var song = obj.result[i];
						result += '<tr>';
						result += '<td nowrap>' + song.no + '</td>';
						result += '<td class="mdui-typo" nowrap><a href="javascript:songAddList(' + song.id + ', ' + song.fee + ');">' +
							song.name + '</a></td>';
						result += '<td class="mdui-typo" nowrap>';
						for (var x = 0; x < song.artists.length; x++) {
							result += '<a href="javascript:artistInfo(' + song.artists[x].id + ');">' +
								song.artists[x].name + '</a>';
							result += x + 1 < song.artists.length ? ' / ' : '';
						}
						result += '</td>';
						result += '<td class="mdui-typo" nowrap>';
						if (song.album != '') {
							result += '<a href="javascript:albumInfo(' + song.albumId +
								');">' + song.album + '</a>';
						} else {
							result += '未知';
						}
						result += '</td>';
						result += '<td class="mdui-typo" nowrap>';
						result += '<a href="javascript:playSong(' + song.id + ', ' + song.fee + ');">立即播放</a>&nbsp;&nbsp;';
						result += '<a href="javascript:songAddList(' + song.id + ', ' + song.fee + ');">添加到列表</a>&nbsp;&nbsp;';
						result += '<a href="javascript:songDownload(' + song.id + ', ' + song.fee + ');">下载</a>&nbsp;&nbsp;';
						result += '<a href="javascript:songInfo(' + song.id + ');">详情</a>';
						result += '</td>';
						result += '</tr>';
					}
					result += '</tbody></table></div>';
					result += '<div class="mdui-row" style="margin: 16px 0 16px 0">';
					result += '<div class="mdui-col-xs-4">';
					result += '<button class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent" onclick="prePage()" ';
					if (page == 1)
						result += 'disabled';
					result += '><i class="mdui-icon material-icons">&#xe314;</i>&nbsp;上一页</button></div>';
					result += '<div class="mdui-col-xs-4">';
					result += '<p class="mdui-typo mdui-center mdui-text-center" style="margin: 6px 0 0 0">';
					result += page + ' / ' + obj.maxPage;
					result += '</p></div>';
					result += '<div class="mdui-col-xs-4">';
					result += '<button class="mdui-btn mdui-btn-raised mdui-ripple mdui-color-theme-accent mdui-float-right" onclick="nextPage()" ';
					if (page == obj.maxPage)
						result += 'disabled';
					result += '>下一页&nbsp;<i class="mdui-icon material-icons">&#xe315;</i></button>';
					result += '</div></div>';
					
					currentPage = page;
					
				} else if (obj.code == 200) {
					mdui.alert('没有找到任何结果', '提示');
					result = '<div class="mdui-card">' +
						'<div class="mdui-card-content mdui-text-color-theme-secondary">' +
						'<center>未找到结果</center>' +
						'</div></div>';
						
				} else {
					mdui.alert('错误代码：' + obj.code + '<br>错误信息：' + obj.msg, '出错啦！');
					result = '<div class="mdui-card">' +
						'<div class="mdui-card-content mdui-text-color-theme-secondary">' +
						'<center>出错啦！<br>' +
						'错误代码：' + obj.code + '<br>' +
						'错误信息：' + obj.msg + '</center>' +
						'</div></div>';
					
				}
				
				resultDiv.innerHTML = result;
				mdui.$('#resultDiv').mutation(); // Div 内组件初始化
				window.scrollTo(0, 0); // 窗口回滚到顶部
			}
		}
	});
}

function searchRecommend() { // 搜索内容推荐
	if (searchKwdDom.value != '') {
		mdui.$.ajax({
			global: false,
			method: 'POST',
			url: './get.php',
			data: {
				mod: 5,
				s: searchKwdDom.value
			},
			success: function(data) {
				if (data != '') {
					var obj;
					try {
						obj = JSON.parse(data);
					} catch(e) {
						// 什么也不做.jpg
					}
					
					if (obj && obj.code == 200 && obj.result) {
						var result = '';
						
						for (var i = 0; i < obj.result.length; i++) {
							result += '<li class="mdui-menu-item">';
							result += '<a href="javascript:searchKey(\'' + obj.result[i].replace('\'', '&123*') + '\', true);">';
							result += obj.result[i] + '</a>';
							result += '</li>';
						}
						
						menuPosi.style.width = mdui.$(searchKwdDom).width() + 'px';
						// menuPosi.style.top = searchKwdDom.getBoundingClientRect().bottom + 'px';
						menuPosi.style.left = (searchKwdDom.getBoundingClientRect().left -
							document.getElementById('container').getBoundingClientRect().left - 8) + 'px';
						
						recoMenuDiv.innerHTML = result;
						recoMenuDiv.style.width = mdui.$(searchKwdDom).width() + 'px';
						recoMenuInst.open();
					
					}
				}
			}
		});
	} else {
		recoMenuInst.close();
	}
}

function searchKey(id, show = false) { // 执行搜索
	searchKwd = id.toString().replace('&123*', '\'');
	if (show) {
		searchKwdDom.value = searchKwd;
	}
	jumpPage(1);
}

function prePage() { // 上一页，不做解释
	jumpPage(currentPage - 1);
}

function nextPage() { // 下一页，不做解释
	jumpPage(currentPage + 1);
}

function toggleDarkmode(button) {
	if (getCookie('darkmode') == 'true') {
		if (mdui.$('body').hasClass('mdui-theme-layout-auto'))
			mdui.$('body').removeClass('mdui-theme-layout-auto');
		
		if (mdui.$('body').hasClass('mdui-theme-layout-dark'))
			mdui.$('body').removeClass('mdui-theme-layout-dark');
		
		setCookie('darkmode', 'false');
		
		button.innerHTML = '<i class="mdui-icon material-icons">&#xe3ac;</i>';
		
	} else {
		if (mdui.$('body').hasClass('mdui-theme-layout-auto'))
			mdui.$('body').removeClass('mdui-theme-layout-auto');
		
		mdui.$('body').addClass('mdui-theme-layout-dark');
		
		setCookie('darkmode', 'true');
		
		button.innerHTML = '<i class="mdui-icon material-icons">&#xe3a9;</i>';
		
	}
}

function enableConsole(button) {
	if (!vConsole) {
		button.setAttribute('disabled', true);
		button.getElementsByTagName('a')[0].setAttribute('disabled', true);
		vConsole = new VConsole();
		console.log('====================================\n' +
			'友情提示：\n' +
			'请不要在 Console 中运行你不清楚的代码。\n' +
			'有心之人可能会利用这些代码进行 xss 攻击。\n' +
			'====================================');
		mdui.alert('vConsole 已启用', '提示');
	}
}