"use strict";

(function () {
  "use strict";

  var config = {
    googlekey: "1PeYaVWqSWABu6kWKI3VF48_iL-YLAyFJIo9j8Hnx73Y",
    url: "https://docs.google.com/spreadsheet/pub",
    qstring: "?hl=en_US&hl=en_US&output=html&key=",
    uiFilters: { State: [], Technology: [], Category: [] },
    mapCenter: [-95.84, 37.81],
    mapZoom: 3,
    mapboxToken:
      "pk.eyJ1IjoibnJlbCIsImEiOiJNOTcxYUhZIn0.Jc7TB_G2VQYs9e0S2laKcw",
    // tileLayer: 'mapbox.streets',
    tileLayer: "mapbox://styles/energy/ckhc7eaqv0mjm19p3yr4jtlcw",
    mapContainer: "map",
    datatableContainer: "datatable",
    dataHeaders: [
      "Project",
      "Tribe",
      "State",
      "Year",
      "Assistance Type",
      "Category",
      "Technology",
    ],
  };

  var map = void 0,
    datatable = void 0,
    data = void 0,
    getLayer = void 0,
    markerclusters = void 0

  var spiderifier;

  window.onload = function () {
    init(config);
  };

  function init(cfg) {
    Tabletop.init({
      key: cfg.url + cfg.qstring + cfg.googlekey,
      callback: render,
      simpleSheet: true,
    });
  }

  function render(googledata /*, tabletop */) {
    data = googledata; // make the data global

    linkTitle(data); // mashup the project name and hyperlink
    buildUI(data);
    renderMap(config);
    getFilterValues(config);
    renderMapMarkers(data);
    countMarkersFromState("Alaska", data);
    renderDataTable(data);
  }

  function buildHtmlTemplates(src, uiobj) {
    var tmplSrc = $("script")
      .filter('[data-template="' + src + '"]')
      .html();

    var template = Handlebars.compile(tmplSrc);

    return template(uiobj);
  }

  /**
   *
   * buildUI - build the inputs/selects/checkboxes used to control the map and table
   * @param  {array} data rows from the datasource
   *
   */
  function buildUI(dataarray) {
    var $ui = $("#ui-controls");
    var uiObj = {};

    // todo: refactor - this is not efficient... relooping thru data
    Object.keys(config.uiFilters).forEach(function (title) {
      uiObj[title] = dataarray
        .map(function (result) {
          return result[title];
        })
        .sort()
        .filter(function (a, b, c) {
          return c.indexOf(a) === b;
        }); // grab unique items
    });

    $ui.find("[data-target]").each(function (idx, el) {
      var target = $(el).data().target;

      $(el).append(buildHtmlTemplates(target, uiObj));
    });

    // event handler for inputs
    
  }

  /**
   * Wrap the project name in a hyperlink
   *
   * @param  {array} data - rows from datasource
   *
   */
  function linkTitle(dataarray) {
    dataarray.forEach(function (row) {
      row.Project =
        '<a target="_blank" href="' + row.Link + '">' + row.Project + "</a>";
    });
  }

  /**
   * todo: if one of our headers isn't in the data, prune it so DT doesn't throw an error
   * [renderDataTable description]
   * @param  {[type]} data [description]
   */
  function renderDataTable(dataarray) {
    // set up columns properly
    var columns = config.dataHeaders.map(function (header) {
      return {
        title: header,
        data: header,
      };
    });

    // swap footer UI element placement
    var dom =
      '<"row"<"col-sm-6"l><"col-sm-6"f>>' +
      '<"row"<"col-sm-12"tr>>' +
      '<"row"<"col-sm-5"p><"col-sm-7"i>>';

    // init the datatable
    datatable = $("#" + config.datatableContainer).DataTable({
      data: dataarray,
      columns: columns,
      dom: dom,
      language: { search: "Search table:" },
    });
  }

  /**
   *
   * renderMap - set the zoom, coords, tiles, and create a mapbox map
   * @return {[type]} [description]
   *
   */

  function renderMap(cfg) {
    mapboxgl.accessToken =
      "pk.eyJ1IjoibnJlbC1jb21hcHMiLCJhIjoiY2pveGNkcmFrMjdjeDNwcGR4cTF3c3ZhZiJ9.zrGPMAY7OCtiwuSXTWv0fQ";
    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/light-v10",
      center: cfg.mapCenter,
      zoom: cfg.mapZoom,
      maxZoom: 13,
    });

    spiderifier = new MapboxglSpiderifier(map, {
      customPin: true,
      initializeLeg: function (spiderLeg) {
        var $spiderPinCustom = $("<div>", { class: "spider-point-circle" });
        var marker = spiderLeg.feature;

        $(spiderLeg.elements.pin).append($spiderPinCustom);
        $spiderPinCustom.css({
          width: "30px",
          height: "30px",
          "margin-left": "-15px",
          "margin-top": "-15px",
          "background-color": "rgba(110, 204, 57, 1)",
          "border-radius": "50%",
        });
        let content = "<h4>" + marker.Tribe + "</h4>";
        content += "<h5>" + marker.Project + "</h5>";
        var popup = new mapboxgl.Popup({
          closeOnClick: true,
          offset: MapboxglSpiderifier.popupOffsetForSpiderLeg(spiderLeg),
        }).addTo(map);
        popup.setHTML(content);
        spiderLeg.mapboxMarker.setPopup(popup);
      },
    });
  }
  /**
   *
   * getFilterValues - check the state of our UI elements
   *
   */
  function getFilterValues(cfg) {
    Object.keys(cfg.uiFilters).forEach(function (filter) {
      var $el = $('#ui-controls [data-target="' + filter + '"] :checked');

      cfg.uiFilters[filter].length = 0; // clear out existing array

      $el.each(function (idx, el) {
        if (el.value.length) {
          cfg.uiFilters[filter].push(el.value);
        }
      });
    });
  }

  /**
   *
   * renderMapMarkers -
   * @param  {array} data -
   *
   */

  function updateSource(dataarray) {
    let geojsondata = GeoJSON.parse(dataarray, {
      Point: ["Latitude", "Longitude"],
    }); //todo: abstract out lat/lon field

    geojsondata.features = geojsondata.features.filter(feat => filterData(feat, config.uiFilters));
    console.log(geojsondata.features)

    map.getSource('locations').setData(geojsondata)
    zoomMapBounds(geojsondata.features, config);
  }
  
  function renderMapMarkers(dataarray) {
    
    var $ui = $("#ui-controls");

    map.on("load", function () {
      let geojsondata = GeoJSON.parse(dataarray, {
        Point: ["Latitude", "Longitude"],
      }); //todo: abstract out lat/lon field

      map.addSource("locations", {
        type: "geojson",
        data: geojsondata,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "locations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "rgba(110, 204, 57, 0.6)",
            10,
            "rgba(240, 194, 12, 0.6)",
            50,
            "rgba(241, 128, 23, 0.6)",
          ],
          "circle-radius": 20,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "locations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "rgba(110, 204, 57, 0.6)",
          "circle-radius": 20,
        },
      });

      map.addLayer({
        id: "unclustered-count",
        type: "symbol",
        source: "locations",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": "1",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
      });


      map.on('zoomstart', function(){
        spiderifier.unspiderfy();
      });

      $ui.on("change", "input, select", function () {      
        getFilterValues(config);
        updateSource(data)
        // zoomMapBounds(markerclusters, config);
        filterDataTable();
      });

      map.on("click", "clusters", function (e) {
        if (e.originalEvent.srcElement.className === "spider-point-circle") {
          return;
        }

        var features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        var clusterId = features[0].properties.cluster_id;
        map
          .getSource("locations")
          .getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err) return;
            if (map.getZoom() !== 13) {
              map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom,
              });
            }
          });

        if (!features.length || map.getZoom() !== 13) {
          return;
        } else {
          map
            .getSource("locations")
            .getClusterLeaves(clusterId, 100, 0, function (err, leafFeatures) {
              if (err) {
                return console.error("problem with leaf features", err);
              }
              var markers = _.map(leafFeatures, function (leafFeature) {
                return leafFeature.properties;
              });
              spiderifier.spiderfy(features[0].geometry.coordinates, markers);
            });
        }
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup at
      // the location of the feature, with
      // description HTML from its properties.
      map.on("click", "unclustered-point", function (e) {
        var coordinates = e.features[0].geometry.coordinates.slice();
        let content = "<h4>" + e.features[0].properties.Tribe + "</h4>";
        content += "<h5>" + e.features[0].properties.Project + "</h5>";

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup().setLngLat(coordinates).setHTML(content).addTo(map);
      });
    });
  }

  function countMarkersFromState(state, dataarray) {
    let count = 0;
    dataarray.forEach((point) => {
      if (point.State === state) count++;
    });
    $("#count-alaska").text(count);
  }

  /**
   * Zoom the map to show all markers if there are any.
   */
  function zoomMapBounds(features, cfg) {

    var bounds = new mapboxgl.LngLatBounds();

    features.forEach(function(feature) {
        bounds.extend(feature.geometry.coordinates);
    });
    if (features.length) {
      map.fitBounds(bounds, {maxZoom: 5, padding: 100});
    } else {
      map.easeTo({
        center: cfg.mapCenter,
        zoom: cfg.mapZoom,
      });
      alert("No projects fit the criteria.");
    }
  }

  /**
   * clearMarkers - remove the marker layer from the map
   * @param  {object} markerLayer
   */
  /**
   * filterData - find a value within an object's keys
   * @param  {object} feature
   * @param  {object} filters
   * @return {boolean} true if the feature matches
   */
  function filterData(feature, filters) {
    var bln = true;

    Object.keys(filters).forEach(function (filter) {
      var props = void 0;

      if (feature.properties[filter]) {
        props = feature.properties[filter].split(","); // convert comma separated string to array

        bln = bln && matches(props, filters[filter]);
      }
    });

    return bln;
  }

  /**
   * matches - check if any of the criteria match our properties
   *
   * @param  {array} needles list of properties of an object
   * @param  {array} haystack array containing a list of criteria we're looking for
   *
   * @return {boolean} true if any of needles are in haystack
   */
  function matches(needles, haystack) {
    var ismatch = void 0;

    ismatch = haystack.length
      ? haystack.some(function (option) {
          return needles.indexOf(option) >= 0;
        })
      : true;
    return ismatch;
  }

  /**
   * escapeRegExp - make a string safe for use as a regular expression
   * @param  {string} str input string
   * @return {string}    string with special regex characters escaped
   */
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  /**
   * filterDataTable - use datatables search/filter function to filter the table
   * @param  {[type]} terms [description]
   *
   */
  function filterDataTable() {
    Object.keys(config.uiFilters).forEach(function (filter) {
      var idx = config.dataHeaders.indexOf(filter);

      // build out regex terms that match the word/phrase exactly
      // eg don't let "other" match "geothermal"
      // and escape out control characters
      var terms = config.uiFilters[filter].map(function (val) {
        val = escapeRegExp(val);
        return "^" + val + "$";
      });

      // convert array to pipe-separated string for regex search
      var regexterms = terms.join("|");

      datatable.column(idx).search(regexterms, true, false);
    });

    datatable.draw();
  }

  /**
   * 	Event handler for Alaska UI button
   */
  $(".map-navigation").on("click", "a", function (e) {
    e.preventDefault();

    var pos = $(e.delegateTarget).children().data("position");
    console.log("pos", pos);
    if (pos) {
      var loc = pos.split(",").reverse();

      map.easeTo({
        center: loc,
        zoom: 3,
      });
    }
  });
})();
