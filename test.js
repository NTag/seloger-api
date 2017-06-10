const seloger = require('./index.js');
const greinerHormann = require('greiner-hormann');

// seloger.getIsochrones(48.8422518, 2.3226046).then(p => { geoj(p[30]) } );

function rpo(p) {
  return p.map(pp => {
    return pp.map(ppp => {
      return [ppp[1], ppp[0]];
    });
  });
}

function geoj(polys) {
  let oo = {
    "type": "FeatureCollection",
    "features": []
  };
  polys.forEach(p => {
    let o = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon"
      }
    };
    o.geometry.coordinates = rpo(p);
    oo.features.push(o);
  });
  console.log(JSON.stringify(oo.features, null, 2));
}

seloger.getBestLocations([
  {lat: 48.87550504928959, lng: 2.3371267318725586, maxtime: 15},
  {lat: 48.84154554060113, lng: 2.3207974433898926, maxtime: 30}
]).then(geoj).catch(console.error);
