<?php
	if ($_SERVER['REQUEST_METHOD'] != 'POST') {
		header('HTTP/1.1 404 Not Found');
		die();
	}
	
	if ($_POST['mod'] == 1) {
		$data = getUrl('http://music.163.com/api/search/pc/?type=1&limit=20&s=' . 
			rawurlencode($_POST['s']) . '&offset=' . ($_POST['page'] - 1) * 20);
		$data = json_decode($data, true);
		
		$return = array();
		
		if ($data['code'] == 200) { // 搜索歌曲并输出搜索结果列表
			$return['code'] = 200;
			
			for ($i = 0; $i < count($data['result']['songs']); $i++) {
				$song = $data['result']['songs'][$i];
				
				$return['result'][$i]['no'] = ($_POST['page'] - 1) * 20 + ($i + 1);
				
				$return['result'][$i]['id'] = $song['id'];
				$return['result'][$i]['name'] = $song['name'];
				$return['result'][$i]['albumId'] = $song['album']['id'];
				$return['result'][$i]['album'] = $song['album']['name'];
				
				$return['result'][$i]['artists'] = $song['artists'];
				$return['result'][$i]['fee'] = $song['fee'];
				
			}
			
			$return['currentPage'] = $_POST['page'];
			$return['maxPage'] = ceil($data['result']['songCount'] / 20);
			
		} else {
			if ($data) {
				$return['code'] = $data['code'];
				$return['msg'] = $data['msg'];
				
			} else {
				$return['code'] = -999;
				$return['msg'] = '服务器拉取信息失败';
				
			}
		}
		
		echo json_encode($return);
		
	} elseif ($_POST['mod'] == 2) { // 获取歌曲信息
		$return = array();
		
		if (empty($_POST['songid'])) {
			$return['code'] = -10;
			die(json_encode($return));
		}
		
		$data = getUrl('http://music.163.com/api/cloudsearch/pc/?type=1&s=' . 
			rawurlencode($_POST['songid']));
		$data = json_decode($data, true);
		
		if ($data['code'] == 200) {
			$return['result'] = $data['result']['songs'][0];
			$return['code'] = 200;
			
		} elseif ($data) {
			$return['code'] = $data['code'];
			$return['msg'] = $data['msg'];
			
		} else {
			
		}
		
		echo json_encode($return);
		
	} elseif ($_POST['mod'] == 3) { // 获取艺术家信息
		$return = array();
		
		if (empty($_POST['artistid'])) {
			$return['code'] = -10;
			die(json_encode($return));
		}
		
		$data = getUrl('http://music.163.com/api/v1/artist/' .
			rawurlencode($_POST['artistid']) . '?limit=1');
		$data = json_decode($data, true);
		
		if ($data['code'] == 200) {
			$return['result'] = $data['artist'];
			
			$songsCount = count($data['hotSongs']) > 5 ? 5 : count($data['hotSongs']);
			for ($i = 0; $i < $songsCount; $i++) {
				$return['result']['hotSongs'][$i]['name'] = $data['hotSongs'][$i]['name'];
				$return['result']['hotSongs'][$i]['id'] = $data['hotSongs'][$i]['id'];
				$return['result']['hotSongs'][$i]['fee'] = $data['hotSongs'][$i]['fee'];
			}
			
			$return['code'] = 200;
			
		} elseif ($data) {
			$return['code'] = $data['code'];
			$return['msg'] = $data['msg'];
			
		} else {
			$return['code'] = -999;
			$return['msg'] = '服务器拉取信息失败';
			
		}
		
		echo json_encode($return);
		
	} elseif ($_POST['mod'] == 4) { // 获取专辑信息
		$return = array();
		
		if (empty($_POST['albumid'])) {
			$return['code'] = -10;
			die(json_encode($return));
		}
		
		$data = getUrl('http://music.163.com/api/v1/album/' .
			rawurlencode($_POST['albumid']) . '?limit=1');
		$data = json_decode($data, true);
		
		if ($data['code'] == 200) {
			$return['result'] = $data['album'];
			
			$songsCount = count($data['songs']);
			$songs = array();
			for ($i = 0; $i < $songsCount; $i++) {
				$songs[$i]['no'] = $i + 1;
				$songs[$i]['name'] = $data['songs'][$i]['name'];
				$songs[$i]['id'] = $data['songs'][$i]['id'];
				$songs[$i]['artists'] = $data['songs'][$i]['ar'];
				$songs[$i]['fee'] = $data['songs'][$i]['fee'];
			}
			$return['result']['songs'] = $songs;
			
			$return['code'] = 200;
			
		} elseif ($data) {
			$return['code'] = $data['code'];
			$return['msg'] = $data['msg'];
			
		} else {
			$return['code'] = -999;
			$return['msg'] = '服务器拉取信息失败';
			
		}
		
		echo json_encode($return);
		
	} elseif ($_POST['mod'] == 5) {
		$data = getUrl('http://music.163.com/api/search/pc/?type=1&limit=6&offset=0&s=' . 
			rawurlencode($_POST['s']));
		$data = json_decode($data, true);
		
		$return = array();
		
		if ($data['code'] == 200) { // 搜索歌曲并输出搜索结果列表
			$return['code'] = 200;
			
			$songCount = count($data['result']['songs']) < 6 ? count($data['result']['songs']) : 6;
			for ($i = 0; $i < $songCount; $i++) {
				$song = $data['result']['songs'][$i];
				$return['result'][$i] = $song['name'];
			}
			
		} else {
			if ($data) {
				$return['code'] = $data['code'];
				$return['msg'] = $data['msg'];
				
			} else {
				$return['code'] = -999;
				$return['msg'] = '服务器拉取信息失败';
				
			}
		}
		
		echo json_encode($return);
	}
	
	function getUrl($url) {
		$curl = curl_init();
		curl_setopt($curl, CURLOPT_URL, $url);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($curl, CURLOPT_BINARYTRANSFER, true);
		curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 4.4.4; HM 2A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.117 Mobile Safari/537.36');
		$data = curl_exec($curl);
		curl_close($curl);
		return $data;
	}
	
	function postUrl($url, $post_data) {
		$curl = curl_init();
		curl_setopt($curl, CURLOPT_URL, $url);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($curl, CURLOPT_BINARYTRANSFER, true);
		curl_setopt($curl, CURLOPT_USERAGENT, 'Mozilla/5.0 (Linux; Android 4.4.4; HM 2A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.117 Mobile Safari/537.36');
		curl_setopt($curl, CURLOPT_POST, 1);
		curl_setopt($curl, CURLOPT_POSTFIELDS, $post_data);
		$data = curl_exec($curl);
		curl_close($curl);
		return $data;
	}
?>