/* eslint-disable */
// const locations = JSON.parse(document.getElementById('map').dataset.locations);
export const displayMap = function(locations) {
  mapboxgl.accessToken =
    'pk.eyJ1IjoicHJhdGhhbXBhbmNob2xpNyIsImEiOiJja3Q0bHdhZHoxNWVzMnBzMnh2eDh4ZTV5In0.IR37Z0RCsTvbObaSznmMNA';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/prathampancholi7/ckt4qjwr41bak17mw3roilqvv',
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
