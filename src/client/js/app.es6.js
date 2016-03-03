(() => {
    'use strict'


    const config = {
        googlekey : '1PeYaVWqSWABu6kWKI3VF48_iL-YLAyFJIo9j8Hnx73Y'
      , url : 'https://docs.google.com/spreadsheet/pub'
      , qstring: '?hl=en_US&hl=en_US&output=html&key='
      , uiFilters : { 'State': [], 'Technology': [], 'Category': [] }
      , mapCenter: [ 39.81,-99.84 ]
      , mapZoom: 4
      , mapboxToken: 'pk.eyJ1IjoibnJlbCIsImEiOiJNOTcxYUhZIn0.Jc7TB_G2VQYs9e0S2laKcw'
      , tileLayer: 'mapbox.streets'
      , mapContainer: 'map'
      , datatableContainer: 'datatable'
      , dataHeaders: ['Project', 'Tribe', 'State', 'Year','Assistance Type', 'Category', 'Technology']
    }


    let map
      , datatable
      , data
      , markerclusters


    window.onload = function() {
        init( config )
    }

    function init( cfg ) {
        Tabletop.init({
            key: cfg.url + cfg.qstring + cfg.googlekey
          , callback: render
          , simpleSheet: true
        })
    }


    function render( googledata, tabletop ) {
        data = googledata // make the data global

        linkTitle( data ) // mashup the project name and hyperlink

        buildUI( data )

        renderMap( config )

        getFilterValues( config )

        renderMapMarkers( data )

        renderDataTable( data )
    }


    function buildHtmlTemplates( src, uiobj ) {
        let tmplSrc = $('script').filter( '[data-template="' + src + '"]' ).html()

        let template = Handlebars.compile( tmplSrc )

        return  template(  uiobj  )
    }

    /**
     *
     * buildUI - build the inputs/selects/checkboxes used to control the map and table
     * @param  {array} data rows from the datasource
     *}())
     */
    function buildUI( dataarray ) {
        const $ui = $('#ui-controls')
        let uiObj = {}

        // todo: refactor - this is not efficient... relooping thru data
        Object.keys(config.uiFilters).forEach( title => {

            uiObj[ title ] = dataarray
                .map( result => result[title] )
                .sort()
                .filter( ( a, b, c ) => c.indexOf(a) === b ) // grab unique items
        })

        $ui.find('[data-target]').each( (idx, el) => {
            let target = $(el).data().target

            $(el).append( buildHtmlTemplates( target, uiObj ) )
        })
    }

    /**
     * Wrap the project name in a hyperlink
     *
     * @param  {array} data - rows from datasource
     *
     */
    function linkTitle( dataarray ) {

        dataarray.forEach( row => {
            row.Project = `<a target="_blank" href="${row.Link}">${row.Project}</a>`
        })
    }

    /**
     * todo: if one of our headers isn't in the data, prune it so DT doesn't throw an error
     * [renderDataTable description]
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    function renderDataTable( dataarray ) {

        // set up columns properly
        const columns = config.dataHeaders.map( header => {
              return {
                  title: header
                , data: header
              }
        })

        // swap footer UI element placement
        const dom = '<"row"<"col-sm-6"l><"col-sm-6"f>>' +
                  '<"row"<"col-sm-12"tr>>' +
                  '<"row"<"col-sm-5"p><"col-sm-7"i>>'

        // init the datatable
        datatable = $( '#' + config.datatableContainer ).DataTable({
            data: dataarray
          , columns: columns
          , dom: dom
          , language: { search: 'Search table:' }
        })

    }

    /**
     * renderMap - set the zoom, coords, tiles, and create a mapbox map
     * @return {[type]} [description]
     */
    function renderMap( cfg ) {
        L.mapbox.accessToken = cfg.mapboxToken

        map = L.mapbox.map( cfg.mapContainer )
            .setView( cfg.mapCenter, cfg.mapZoom)
            .addLayer( L.mapbox.tileLayer( cfg.tileLayer ) )
    }

    /**
     *
     * getFilterValues - check the state of our UI elements
     *
     */
    function getFilterValues( cfg ) {

        Object.keys( cfg.uiFilters ).forEach( filter => {

            const $el = $('#ui-controls [data-target="' + filter + '"] :checked')

            cfg.uiFilters[filter].length = 0 // clear out existing array

            $el.each( (idx, el) => {
                if ( el.value.length ) {
                    cfg.uiFilters[filter].push( el.value )
                }
            })

        })

    }

    /**
     *
     * renderMapMarkers -
     * @param  {array} data -
     *
     */
    function renderMapMarkers( dataarray ) {
        let numMarkers = 0 // a counter to know if our layer is empty

        markerclusters = new L.MarkerClusterGroup(
            {
                spiderfyOnMaxZoom: true
              , singleMarkerMode:  true
              , disableClusteringAtZoom: 20 // so we can see markers with identical lat/lon
            }
        )

        // manually fire spiderfy
        // markerclusters.on( 'clusterclick', function (e) {
        //     e.layer.spiderfy()
        // })

        const geojsondata = GeoJSON.parse( dataarray, { Point: ['Latitude','Longitude']} ) //todo: abstract out lat/lon field

        const featureLayer = L.mapbox.featureLayer().setGeoJSON( geojsondata )

        // filter data
        featureLayer.setFilter(  feature => filterData( feature, config.uiFilters ))


        // add markers and popup content to marchercluster group
        featureLayer.eachLayer( marker => {

            let content = `<h3>${marker.feature.properties.Tribe}</h3>`

            content += `<h4>${marker.feature.properties.Project}</h4>`

            marker.bindPopup( content )

            marker.setIcon( L.mapbox.marker.icon({}) )

            markerclusters.addLayer( marker )

            numMarkers = numMarkers + 1
        })


        // add markers to map
        map.addLayer( markerclusters )

        // if we have markers, zoom to them, otherwise zoom out
        if ( numMarkers > 0) {
            map.fitBounds( markerclusters.getBounds() )
        } else {
            map.setView( config.mapCenter, config.mapZoom)

            alert('No projects fit the criteria.')
        }


    }



    /**
     * clearMarkers - remove the marker layer from the map
     * @param  {object} markerLayer
     */
    function clearMarkers( markerLayer ) {
        if ( markerLayer !== undefined ) {
            map.removeLayer( markerLayer )
        } else {
            console.log('marker layer was undefined. nothing to remove.')
        }
    }




    /**
     * filterData - find a value within an object's keys
     * @param  {object} feature
     * @param  {object} filters
     * @return {boolean} true if the feature matches
     */
    function filterData( feature, filters ) {

        let bln = true

        Object.keys( filters ).forEach( filter => {
            let props

            if ( feature.properties[ filter ] ) {
                props = feature.properties[ filter ].split(',') // convert comma separated string to array

                bln = bln && matches( props, filters[ filter ] )
            }

        })

        return bln
    }


    /**
     * matches - check if any of the criteria match our properties
     *
     * @param  {array} needles list of properties of an object
     * @param  {array} haystack array containing a list of criteria we're looking for
     *
     * @return {boolean} true if any of needles are in haystack
     */
    function matches( needles, haystack ){

        let ismatch

        ismatch = haystack.length ? haystack.some( option => needles.indexOf( option ) >= 0 ) : true
        // if ( haystack.length ) {

        //   ismatch   = haystack.some( option => needles.indexOf( option ) >= 0 )

        // }

        return ismatch
    }


    /**
     * filterDataTable - use datatables search/filter function to filter the table
     * @param  {[type]} terms [description]
     *
     */
    function filterDataTable() {


        Object.keys( config.uiFilters ).forEach( filter => {

            let idx = config.dataHeaders.indexOf( filter )

            // build out regex terms that match the word/phrase exactly
            // eg don't let "other" match "geothermal"
            let terms = config.uiFilters[ filter ].map( val => `^${val}$` )

            // convert array to pipe-separated string for regex search
            let regexterms = terms.join('|')

            datatable.column( idx ).search( regexterms, true, false )

        })

        datatable.draw()
    }

    // delegated event handler for when inputs are built out and changed
    $('#ui-controls').on( 'change','input, select', function(){
        clearMarkers( markerclusters )
        getFilterValues( config )
        renderMapMarkers( data )
        filterDataTable()
    })
})()
