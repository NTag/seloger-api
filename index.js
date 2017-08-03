const osmosis = require('osmosis');
const rp = require('request-promise');
const martinez = require('martinez-polygon-clipping');

let sl = {};

/**
 * Return the isochrone polygons 15, 30, 45 and 60 mn using
 * atelier01.net/metro/paris/isochrone
 * @param {number} lat
 * @param {number} lng
 * @return {Promise}
 */
sl.getIsochrones = function(lat, lng) {
  return rp('https://atelier01.net/metro/paris/isochrone?latlng=' + lat + ',' + lng).then(html => {
    let paths = html.split(/paths: /g)
    paths.splice(0, 1);
    paths = paths.map(h => {
      return h
        .replace(/map: map([^]+)$/, '')
        .trim()
        .replace(/,$/, '');
    }).map(h => {
      return h
        .replace(/new google\.maps\.LatLng\(/g, '[')
        .replace(/\)/g, ']');
    });
    let p = [];
    paths.forEach(h => {
      p.push(eval(h)); // [TODO] don't use eval
    });
    p = p.map(pp => {
      return pp.map(h => {
        let hh = [];
        let last = [-1, -1];
        h.forEach(e => {
          if (e[0] !== last[0] || e[1] !== last[1]) {
            hh.push(e);
            last = e;
          }
        });
        return hh;
      }).filter(h => { return h.length > 1}).map(h => {
        return [h];
      });
    });
    return {
      15: p[0],
      30: p[1],
      45: p[2],
      60: p[3]
    };
  }).catch(function (err) {
    return err;
  });
};

/**
 * Return an array of (multi)polygons, sorted by preference, which give
 * a quick access to the specified places, according to their preferences
 * @param {array} placesp Array of objects {lat, lng, maxtime}, with maxtime 15, 30, 45 or 60 mn
 * @return {Promise}
 */
sl.getBestLocations = function(places) {
  let reqs = [];
  let polys = [];
  places.forEach(p => {
    let req = sl.getIsochrones(p.lat, p.lng).then(iso => {
      polys.push(iso[p.maxtime]);
    });
    reqs.push(req);
  });
  return Promise.all(reqs).then(() => {
    let l = polys.length;
    if (l < 1) {
      return Promise.reject("Zero area to intersect");
    }
    let polygon = polys[0]; // the final (multi)polygon
    for (let i = 1; i < l; i += 1) {
      let ps = polys[i];
      let npolygon = [];
      polygon.forEach(p1 => {
        ps.forEach(p2 => {
          let np = martinez.intersection(p1, p2);
          if (np && np.length > 0) {
            npolygon.push(np[0]);
          }
        });
      });
      polygon = npolygon;
      // polygon = martinez.intersection(polygon, ps);
    }
    return polygon;
  });
};

sl.getOffers = (url) => {
  // list of announces (JSON) http://www.seloger.com/map,services,pushpins-info.json?idtt=1&naturebien=1&idtypebien=1%2C2&ci=750101%2C750102%2C750103%2C750104%2C750105%2C750106%2C750107&tri=a_px&pxmin=600&pxmax=900&nb_pieces=1%2C2&etagemin=3&LISTING-LISTpg=2&bd=ListToCarto_SL

  // info about a specific offer (html) http://www.seloger.com/map,services,announce-grid.htm?idtt=1&naturebien=1&idtypebien=1%2C2&ci=750101%2C750102%2C750103%2C750104%2C750105%2C750106%2C750107&tri=a_px&pxmin=600&pxmax=900&nb_pieces=1%2C2&etagemin=3&LISTING-LISTpg=2&lida=116554697&ref=map

  // JSON details about an offer http://www.seloger.com/map,services,announce-detail.json?idannonce=116554697

  return rp(url).then(html => {
    const mainJson = html.replace(/^([\s\S]+)var ava_data = ([^;]+);([\s\S]+)$/g, '$2').replace('logged: logged,', '');
    const mainData = eval('(' + mainJson + ')');
    const products = mainData.products.filter(p => p.idannonce && p.prix);

    return products;
  });
};

module.exports = sl;
