'use strict';

var eventsToListen = ['POSITION', 'FLIGHTS', 'AIRPORTS'];
var socket = {};
var disconnectedInerval;
var url = '';
var options = '';
var title = document.title;
var localdb = null;
var mapa;
var flights = [];
var airports= [];
var planes=[];
var airport_marker =[];
var plain_marker = {};

$(function() {
  $('#jsonData').hide();
  $('.emitted-msg').hide();
  $('.emitted-failure-msg').hide();
  $('.listen-failure-msg').hide();
  $('.listen-added-msg').hide();
  $('.disconnected-alert, .connected-alert').hide();
  $('#eventPanels').prepend(makePanel('POSITION'));
  $('#eventPanels').prepend(makePanel('FLIGHTS'));
  $('#eventPanels').prepend(makePanel('AIRPORTS'));
  $('input[type=radio][name=emitAs]').change(function() {
    if (this.value === 'JSON') {
      $('#plainTextData').hide();
      $('#jsonData').show();
    }
    if (this.value === 'plaintext') {
      $('#plainTextData').show();
      $('#jsonData').hide();
    }
  });

  //processHash();
  initHistory();
});


function initMap() {
  var myLatLng = {lat: -33.38899, lng: -70.7846};

  mapa = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: myLatLng
  });



}

function setMarker_maps_airport(key,json){
  if (!airports.includes(key)){
    airports.push(key);
    var position = {lat: json[key]["airport_position"][0], lng: json[key]["airport_position"][1]};
    var marker = new google.maps.Marker({
      position: position,
      map: mapa,
      title: json[key]['name']
    });
    airport_marker.push(marker);
    var contentString = '<div id="content">'+
       '<div id="siteNotice">'+
       '</div>'+
       '<h1 id="firstHeading" class="firstHeading">'+key+'</h1>'+
       '<div id="bodyContent" style="text-align:left">'+
       '<p><b>Nombre</b>: '+json[key]['name']+'</p>'+
       '<p><b>Ciudad</b>: '+json[key]['city']+'</p>'+
       '<p><b>País</b>: '+json[key]['country']+'</p>'+
       '<p><b>Código del País</b>: '+json[key]['country_code']+'</p>'+
       '<p><b>Código del Aeropuerto</b>: '+json[key]['airport_code']+'</p>'+
       '<p><b>Posición del Aeropuerto</b>: '+json[key]['airport_position']+'</p>'+

       '</div>'+
       '</div>';

   var infowindow = new google.maps.InfoWindow({
     content: contentString
   });

   marker.addListener('click', function() {
     infowindow.open(map, marker);
   });






  }


}

function setMarker_maps(data){
  var position = {lat: data["position"][0], lng: data["position"][1]};

  var new_marker = new google.maps.Circle({
    center: position,
    radius: 50,
    strokeColor: '#009900',
    map: mapa
  });
  if (!planes.includes(data["code"]) ){
    planes.push(data["code"]);
    var marker = new google.maps.Marker({
      position: position,
      map: mapa,
      icon: 'https://static.getjar.com/icon-50x50/f2/856551_thm.jpg',
      title: data["code"]
    });
    plain_marker[data['code']]={'marker':marker};
    emitData('AIRPORTS');
    emitData('FLIGHTS');
  }
  var latlng = new google.maps.LatLng(data["position"][0],data["position"][1])
  plain_marker[data['code']]['marker'].setPosition(latlng);
}


function create_info_window_plane(data, marker){
  var contentString = '<div id="content">'+
     '<div id="siteNotice">'+
     '</div>'+
     '<h1 id="firstHeading" class="firstHeading">'+data['code']+'</h1>'+
     '<div id="bodyContent" style="text-align:left">'+
     '<p><b>Aerolínea</b>: '+data['airline']+'</p>'+
     '<p><b>Origen</b>: '+data['origin']['name']+'</p>'+
     '<p><b>Destino</b>: '+data['destination']['name']+'</p>'+
     '<p><b>Avión</b>: '+data['plane']+'</p>'+
     '<p><b>Asientos</b>: '+data['seats']+'</p>'+

     '</div>'+
     '</div>';

 var infowindow = new google.maps.InfoWindow({
   content: contentString
 });

 marker.addListener('click', function() {
   infowindow.open(map, marker);
 });
}

function setflypath(data){
  if (!flights.includes(data["code"]) ){
    flights.push(data["code"]);
    var flightPlanCoordinates = [
            {lat: data["origin"]["airport_position"][0], lng: data["origin"]["airport_position"][1]},
            {lat: data["destination"]["airport_position"][0], lng: data["destination"]["airport_position"][1]}
          ];

    create_info_window_plane(data, plain_marker[data['code']]['marker']);
    var flightPath = new google.maps.Polyline({
      path: flightPlanCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2
    });
    flightPath.setMap(mapa);


  };

}

//Conexion
function connect_websocket(){
  url = "wss://integracion-tarea-3.herokuapp.com";
  options = '{"path":"/flights"}';
  var opt = options ? JSON.parse(options) : null;
  if (url === '') {
    console.error('Invalid URL given');
  }
  else {
    socket = io(url, $.extend({}, opt, {
      transports: ['websocket']
    }));
    //setHash();
    socket.on('connect', function() {
      clearInterval(disconnectedInerval);
      document.title = title;
    });
    socket.on('disconnect', function(sock) {
      disconnectedInerval = setInterval(function() {
        if (document.title === "Disconnected") {
          document.title = title;
        } else {
          document.title = "Disconnected";
        }
      }, 800);
    });
    registerEvents();
  };
}

function setHash() {
  if (url !== '' && eventsToListen.length > 0) {
    var hashEvents = eventsToListen.slice();
    var messageIndex = hashEvents.indexOf('message');
    if (messageIndex !== -1) {
      hashEvents.splice(messageIndex, 1);
    }
    location.hash = "url=" + window.btoa(url) + "&opt=" + window.btoa(options) + "&events=" + hashEvents.join();
  }
}

function processHash() {
  var hash = location.hash.substr(1);
  if (hash.indexOf('url=') !== -1 && hash.indexOf('events=') !== -1) {
    var hashUrl = window.atob(hash.substr(hash.indexOf('url=')).split('&')[0].split('=')[1]);
    var hashOpt = window.atob(hash.substr(hash.indexOf('opt=')).split('&')[0].split('=')[1]);
    var hashEvents = hash.substr(hash.indexOf('events=')).split('&')[0].split('=')[1].split(',');
    $.merge(eventsToListen, hashEvents);
    $.each(hashEvents, function(index, value) {
      if (value !== '') {
        $('#eventPanels').prepend(makePanel(value));
      }
    });
    $('#connect input:first').val(hashUrl);
    $('#connect_options').val(hashOpt);
    $('#connect').submit();
  }
}

function registerEvents() {
  if (socket.io) {
    $.each(eventsToListen, function(index, value) {
      socket.on(value, function(data) {
        if (!data) {
          data = '-- NO DATA --'
        }
        if (value=='POSITION'){
          setMarker_maps(data);
        }
        else if (value=='FLIGHTS'){
          data.forEach(function(entry){
            setflypath(entry);
          });
        }

        else if (value=='AIRPORTS'){
          for (var key in data){
            setMarker_maps_airport(key,data);
          };

        }

        var elementToExtend = $("#eventPanels").find("[data-windowId='" + value + "']");
        elementToExtend.prepend('<p><span class="text-muted">' + getFormattedNowTime() + '</span><strong> ' + JSON.stringify(data) + '</strong></p>');
      });
    });
  }
}

function parseJSONForm() {
  var result = '{"asd":1}';
  console.log("json to emit " + result);
  return JSON.parse(result);
}

function makePanel(event) {
  return `
    <div class="panel panel-primary">
      <div class="panel-heading">
        <button type="button" class="btn btn-warning btn-xs pull-right" data-toggle="collapse" data-target="#panel-` + event + `-content" aria-expanded="false" aria-controls="panel-` + event + `-content">Toggle panel</button>
        <button type="button" class="btn btn-warning btn-xs pull-right" onclick="clearEvents('` + event + `')">Clear Events</button>
        <h3 class="panel-title">On "` + event + `" Events</h3>
      </div>
      <div data-windowId="` + event + `" class="panel-body collapse in" id="panel-` + event + `-content">
      </div>
    </div>`;
}

function getFormattedNowTime() {
  var now = new Date();
  return now.getHours() + ":" +
    now.getMinutes() + ":" +
    now.getSeconds() + ":" +
    now.getMilliseconds();
}

function initDB(clear) {
  var dbName = 'socketioClientDB';
  if (clear) {
    localdb.destroy().then(function() {
      localdb = new PouchDB(dbName);
    });
  } else {
    localdb = new PouchDB(dbName);
  }
}

function initHistory() {
  initDB(false);
  var ddoc = {
    _id: '_design/index',
    views: {
      index: {
        map: function mapFun(doc) {
          emit(doc._id, doc);
        }.toString()
      }
    }
  };
  localdb.put(ddoc).catch(function(err) {
    if (err.name !== 'conflict') {
      throw err;
    }
  }).then(function() {
    return localdb.query('index', {
      descending: true,
      limit: 20
    });
  }).then(function(result) {
    var rows = result.rows;
    for (var i in rows) {
      var history = rows[i].value;
      addHistoryPanel(history);
    }
  }).catch(function(err) {
    console.log(err);
  });
}

function postDataIntoDB(data, callback) {
  if (localdb == null) {
    localdb = new PouchDB("socketioClientDB");
  }
  localdb.post(data).then(callback);
}

function emit(event, data, panelId) {
  console.log('Emitter - emitted: ' + data);

  var emitData = {
    event: event,
    request: data,
    time: getFormattedNowTime()
  };

  socket.emit(event, data, function(res) {
    var elementToExtend = $("#emitAckResPanels").find("[data-windowId='" + panelId + "']");
    elementToExtend.prepend('<p><span class="text-muted">' + getFormattedNowTime() + '</span><strong> ' + JSON.stringify(res) + '</strong></p>');
  });
}

function addHistoryPanel(history) {
  var histPanelId = history.event;
  var panel = $("#emitHistoryPanels").find("[data-windowId='" + histPanelId + "']");
  if (panel.length == 0) {
    $('#emitHistoryPanels').prepend(makePanel(histPanelId));
  }
  var elementToExtend = $("#emitHistoryPanels").find("[data-windowId='" + histPanelId + "']");
  var historyContent = $('#historyContent').text();
  var id = 'hist-' + new Date().getTime();
  historyContent = historyContent.split('[[id]]').join(id);
  historyContent = historyContent.split('[[time]]').join(history.time);
  historyContent = historyContent.split('[[reqData]]').join(JSON.stringify(history.request));
  historyContent = historyContent.split('[[event]]').join(history.event);
  elementToExtend.prepend(historyContent);
  $("#form" + id).submit(function(e) {
    e.preventDefault();
    var id = $(this).find('[name="historyId"]').val();
    var data = JSON.parse($(this).find('[name="reqData"]').val());
    var event = $(this).find('[name="event"]').val();
    if (socket.io) {
      if (event !== '' && data !== '') {
        emit(event, data, 'emitAck-' + event);
        $('.emitted-msg-' + id).show().delay(700).fadeOut(1000)
      } else {
        $('.emitted-failure-msg-' + id).show().delay(700).fadeOut(1000);
        console.error('Emitter - Invalid event name or data');
      }
    } else {
      $('.emitted-failure-msg-' + id).show().delay(700).fadeOut(1000);
      console.error('Emitter - not connected');
    }
  });
}

function emitData(e){
  if (socket.io) {
    var event = e;
    var data= parseJSONForm();
    if (event !== '' && data !== '') {
      var emitData = {
        event: event,
        request: data,
        time: getFormattedNowTime()
      };
      postDataIntoDB(emitData);
      addHistoryPanel(emitData);
      emit(event, data, 'emitAck-' + event);

    } else {

      console.error('Emitter - Invalid event name or data');
    }
  } else {
    console.error('Emitter - not connected');
  };
}
