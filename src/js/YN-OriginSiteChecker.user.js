// ==UserScript==
// @name            YN-OriginSiteChecker
// @name:ja         Yahoo!ニュースの元サイトをチェック
// @namespace       https://furyutei.work
// @license         MIT
// @version         0.1.0
// @description     Check out the news provider sites that provide articles for Yahoo News Japan
// @description:ja  Yahoo!ニュースに記事を提供しているニュース提供サイトをチェック
// @author          furyu
// @match           https://news.yahoo.co.jp/media
// @match           https://www.google.com/search*
// @grant           none
// @compatible      chrome
// @compatible      firefox
// @supportURL      https://github.com/furyutei/YN-SearchOrigin/issues
// @contributionURL https://memo.furyutei.work/about#send_donation
// ==/UserScript==

( async () => {
'use strict';

// [Array.prototype.map() - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) の Polyfill を参考に、Promise (async な callback) に対応したもの
Array.prototype.map_promise = async function(callback) {
    var T, A, k;
    if (this == null) throw new TypeError('this is null or not defined');
    var O = Object(this);
    var len = O.length >>> 0;
    if (typeof callback !== 'function')  throw new TypeError(callback + ' is not a function');
    if (arguments.length > 1) T = arguments[1];
    A = new Array(len);
    k = 0;
    while (k < len) {
        var kValue, mappedValue;
        if (k in O) {
            kValue = O[k];
            mappedValue = await callback.call(T, kValue, k, O);
            A[k] = mappedValue;
        }
        k++;
    }
    return A;
};

const
    SCRIPT_NAME = 'YN-OriginSiteChecker',
    DEBUG = true,
    
    fetch_interval_milliseconds = 10000,
    csv_header_names = [ 'site_name', 'company_name', 'site_url', 'news_list_url', 'latest_news_url', 'latest_news_title', 'latest_news_site_url' ],
    
    wait = async ( milliseconds ) => await new Promise( resolve => setTimeout( resolve, milliseconds ) ),
    csv_filename_template = 'yahoo_news-media_list_#TIMESTAMP#.csv',
    create_csv_line = ( values ) => values.map( ( value ) => /^[\-+]?\d+\.?\d*(?:E[\-+]?\d+)?$/.test( value ) ? value : '"' + String( value ).replace( /"/g, '""' ) + '"' ).join( ',' ),
    download_csv = ( csv_filename, csv_lines ) => {
        let csv_text = csv_lines.join( '\r\n' ),
            bom = new Uint8Array( [ 0xEF, 0xBB, 0xBF ] ),
            blob = new Blob( [ bom, csv_text ], { 'type' : 'text/csv' } ),
            blob_url = URL.createObjectURL( blob ),
            download_link = document.createElement( 'a' );
        
        download_link.href = blob_url;
        download_link.download = csv_filename;
        document.documentElement.appendChild( download_link );
        download_link.click();
        download_link.remove();
    },
    
    current_url_object = new URL( location.href ),
    
    get_media_info_list = () => [ ... document.querySelectorAll( 'ul#mediaList > li.mediaListItem' ) ].map( ( item ) => {
        let link = item.querySelector( 'a.mediaListItem_media' ),
            media_info = {
                site_name : link.textContent.trim(),
                company_name : item.querySelector( 'span.mediaListItem_company' ).textContent.trim(),
                news_list_url : new URL( link.href, location.href ).href,
            };
        return media_info;
    } ),
    
    get_detail_media_info_list = async ( get_search_result, limit = 0 ) => {
        let media_info_list = get_media_info_list();
        
        if ( 0 < limit ) {
            media_info_list = media_info_list.slice( 0, limit );
        }
        
        let detail_media_info_list = await media_info_list.map_promise( async ( media_info, index ) => {
            let detail_media_info = Object.assign( {}, media_info );
            
            Object.assign( detail_media_info,
                await fetch( media_info.news_list_url )
                    .then( ( response ) => {
                        if ( ! response.ok ) throw Error( response.status + ' ' + response.statusText );
                        return response.text();
                    } )
                    .then( ( html ) => {
                        let doc =  new DOMParser().parseFromString( html, "text/html" ),
                            site_url = doc.querySelector( '#contents h2.mediaHeader_logo a[data-ylk="rsec:pr;slk:img;"]' ).href,
                            latest_news_link = doc.querySelector( '#contents .mediaArticleListMain .newsFeed_list .newsFeed_item a.newsFeed_item_link' ),
                            latest_news_title = latest_news_link.querySelector( '.newsFeed_item_text .newsFeed_item_title' ).textContent.trim(),
                            
                            detail_media_info = {
                                site_url,
                                latest_news_url : latest_news_link.href,
                                latest_news_title,
                                latest_news_site_url : '',
                                search_result : {},
                            };
                        
                        if ( typeof get_search_result != 'function' ) {
                            return detail_media_info;
                        }
                        
                        return get_search_result( { hostname : new URL( site_url ).hostname, keyword : latest_news_title } )
                            .then( ( search_result ) => Object.assign( detail_media_info, { search_result, latest_news_site_url : search_result.site_url } ) )
                            .catch( ( search_result ) => Object.assign( detail_media_info, { search_result } ) );
                    } )
                    .catch( ( error ) => {
                        console.error( error );
                        return {
                            site_url : '',
                            latest_news_url : '',
                            latest_news_title : '',
                            search_result : '',
                        };
                    } )
            );
            
            console.log( detail_media_info );
            
            if ( index < media_info_list.length - 1 ) {
                await wait( fetch_interval_milliseconds );
            }
            return detail_media_info;
        } );
        
        return detail_media_info_list;
    },
    
    check_yahoo_news_media = () => {
        console.log( 'check_yahoo_news_media()' );
        
        let button = document.createElement( 'button' ),
            disable_button = () => {
                button.disabled = true;
                Object.assign( button.style, {
                    color : 'gray',
                    background : 'lightgray',
                    cursor : 'wait',
                } );
            },
            enable_button = () => {
                button.disabled = false;
                Object.assign( button.style, {
                    color : 'black',
                    background : 'lightblue',
                    cursor : 'pointer',
                } );
            };
        
        button.textContent = 'チェック開始';
        Object.assign( button.style, {
            fontSize : '80%',
            padding : '4px 8px',
            fontWeight : 'bolder',
        } );
        enable_button();
        
        button.addEventListener( 'click', ( event ) => {
            disable_button();
            
            event.stopPropagation();
            event.preventDefault();
            
            let child_window = window.open( 'about:blank', SCRIPT_NAME ),
                search_callback = null,
                get_search_result = ( search_info ) => {
                    let search_url = 'https://www.google.com/search?ie=UTF-8&q=' + encodeURIComponent( 'site:' + search_info.hostname + ' ' + search_info.keyword ),
                        promise = new Promise( ( resolve, reject ) => {
                            search_callback = ( search_result ) => {
                                ( search_result.error ? reject : resolve )( search_result );
                            };
                        } );
                    
                    child_window.location.href = search_url;
                    
                    return promise;
                },
                message_handler = ( event ) => {
                    console.log( 'message received: event=', event );
                    
                    if ( event.origin != 'https://www.google.com' ) {
                        console.error( 'origin error:', event.origin );
                        return;
                    }
                    
                    if ( search_callback ) {
                        search_callback( event.data );
                    }
                };
            
            window.addEventListener( 'message', message_handler );
            
            ( async () => {
                let media_info_list = await get_detail_media_info_list( get_search_result );
                
                console.log( media_info_list );
                
                let csv_header = create_csv_line( csv_header_names ),
                    csv_lines = [ csv_header ].concat( media_info_list.map( media_info => create_csv_line( csv_header_names.map( name => media_info[ name ] ) ) ) ),
                    csv_filename = csv_filename_template.replace( /#TIMESTAMP#/g, ( new Date().toISOString().replace(/[\-:Z]/g, '').replace( 'T', '_' ) ) );
                
                window.removeEventListener( 'message', message_handler );
                child_window.close();
                download_csv( csv_filename, csv_lines );
                enable_button();
            } )();
        } );
        
        document.querySelector( '#contents .mediaList .mediaList_explain' ).appendChild( button );
    },
    
    check_search_page = () => {
        console.log( 'check_search_page()' );
        
        if ( window.name != SCRIPT_NAME ) {
            return;
        }
        
        const
            opener_origin = 'https://news.yahoo.co.jp',
            query = current_url_object.searchParams.get( 'q' ) || '',
            hostname = ( query.match( /^site:([^\s]+)/ ) || [] )[ 1 ];
        
        if ( ! hostname ) {
            window.opener.postMessage( {
                error : true,
                error_message : 'hostname not found',
            }, opener_origin );
            return;
        }
        
        const
            site_link = [ ... document.querySelectorAll( '#rso > .g > .rc > .r > a' ) ].filter( link => {
                let url_object = new URL( link.href, location.href );
                
                if ( url_object.hostname == hostname ) {
                    return true;
                }
                
                let url = ( [ ... url_object.searchParams ].filter( param => param[ 0 ] == 'url' )[ 0 ] || [] )[ 1 ];
                
                if ( url && ( new URL( url ).hosname == hostname ) ) {
                    return true;
                }
                
                return false;
            } )[ 0 ];
        
        if ( site_link ) {
            window.opener.postMessage( {
                site_url : site_link.href,
                error : false,
                error_message : '',
            }, opener_origin );
        }
        else {
            window.opener.postMessage( {
                site_url : '',
                error : true,
                error_message : 'site link not found',
            }, opener_origin );
        }
    };

if ( /news\.yahoo\.co\.jp/.test( current_url_object.hostname ) && ( current_url_object.pathname == '/media' ) ) {
    check_yahoo_news_media();
}
else if ( /(^www\.)?google\.com/.test( current_url_object.hostname ) && ( current_url_object.pathname == '/search' ) ) {
    check_search_page();
}

} )();
