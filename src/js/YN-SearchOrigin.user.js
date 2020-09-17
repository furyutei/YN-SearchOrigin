// ==UserScript==
// @name            YN-SearchOrigin
// @name:ja         Yahoo!ニュースの元記事を探す
// @namespace       https://furyutei.work
// @license         MIT
// @version         0.1.0
// @description     Find the original article of the article of Yahoo News Japan.
// @description:ja  Yahoo!ニュースの記事の、元となった記事探しを助けます
// @author          furyu
// @match           https://news.yahoo.co.jp/articles/*
// @match           https://news.yahoo.co.jp/pickup/*
// @match           https://www.google.com/search*
// @grant           none
// @compatible      chrome
// @compatible      firefox
// @supportURL      https://github.com/furyutei/YN-SearchOrigin/issues
// @contributionURL https://memo.furyutei.work/about#%E6%B0%97%E3%81%AB%E5%85%A5%E3%81%A3%E3%81%9F%E5%BD%B9%E3%81%AB%E7%AB%8B%E3%81%A3%E3%81%9F%E3%81%AE%E3%81%8A%E6%B0%97%E6%8C%81%E3%81%A1%E3%81%AF%E3%82%AE%E3%83%95%E3%83%88%E5%88%B8%E3%81%A7
// ==/UserScript==

( async () => {
'use strict';

const
    SCRIPT_NAME = 'YN-SearchOrigin',
    DEBUG = true,
    
    SEARCH_BUTTON_CLASS = SCRIPT_NAME + '-search-button',
    CSS_STYLE_CLASS = SCRIPT_NAME + '-css-rule',
    
    SEARCH_BUTTON_TEXT = '元記事検索',
    
    self = undefined,
    
    format_date = ( date, format, is_utc ) => {
        if ( ! format ) {
            format = 'YYYY-MM-DD hh:mm:ss.SSS';
        }
        
        let msec = ( '00' + ( ( is_utc ) ? date.getUTCMilliseconds() : date.getMilliseconds() ) ).slice( -3 ),
            msec_index = 0;
        
        if ( is_utc ) {
            format = format
                .replace( /YYYY/g, date.getUTCFullYear() )
                .replace( /MM/g, ( '0' + ( 1 + date.getUTCMonth() ) ).slice( -2 ) )
                .replace( /DD/g, ( '0' + date.getUTCDate() ).slice( -2 ) )
                .replace( /hh/g, ( '0' + date.getUTCHours() ).slice( -2 ) )
                .replace( /mm/g, ( '0' + date.getUTCMinutes() ).slice( -2 ) )
                .replace( /ss/g, ( '0' + date.getUTCSeconds() ).slice( -2 ) )
                .replace( /S/g, ( all ) => {
                    return msec.charAt( msec_index ++ );
                } );
        }
        else {
            format = format
                .replace( /YYYY/g, date.getFullYear() )
                .replace( /MM/g, ( '0' + ( 1 + date.getMonth() ) ).slice( -2 ) )
                .replace( /DD/g, ( '0' + date.getDate() ).slice( -2 ) )
                .replace( /hh/g, ( '0' + date.getHours() ).slice( -2 ) )
                .replace( /mm/g, ( '0' + date.getMinutes() ).slice( -2 ) )
                .replace( /ss/g, ( '0' + date.getSeconds() ).slice( -2 ) )
                .replace( /S/g, ( all ) => {
                    return msec.charAt( msec_index ++ );
                } );
        }
        
        return format;
    },
    
    get_gmt_datetime = ( time, is_msec ) => {
        let date = new Date( ( is_msec ) ? time : 1000 * time );
        
        return format_date( date, 'YYYY-MM-DD_hh:mm:ss_GMT', true );
    },
    
    get_log_timestamp = () => format_date( new Date() ),
    
    log_debug = ( ... args ) => {
        if ( ! DEBUG ) {
            return;
        }
        console.debug( '%c' + '[' + SCRIPT_NAME + '] ' + get_log_timestamp(), 'color: gray;', ... args );
    },
    
    log = ( ... args ) => {
        console.log( '%c' + '[' + SCRIPT_NAME + '] ' +  + get_log_timestamp(), 'color: teal;', ... args );
    },
    
    log_info = ( ... args ) => {
        console.info( '%c' +  '[' + SCRIPT_NAME + '] ' + get_log_timestamp(), 'color: darkslateblue;', ... args );
    },
    
    log_error = ( ... args ) => {
        console.error( '%c' + '[' + SCRIPT_NAME + '] ' + get_log_timestamp(), 'color: purple;', ... args );
    },
    
    ChildWindowControl = class {
        constructor( url = null, options = {} ) {
            const
                self = this;
            
            self.initial_url = url;
            self.child_window_counter = 0;
            self.existing_window = null;
            
            if ( ! url ) {
                return;
            }
            
            self.open( url, options );
        }
        
        open( url, options ) {
            const
                self = this;
            
            if ( ! options ) {
                options = {};
            }
            
            let child_window = self.existing_window,
                name = '';
            
            if ( ! options.child_call_parameters ) {
                options.child_call_parameters = {};
            }
            
            try {
                Object.assign( options.child_call_parameters, {
                    script_name : SCRIPT_NAME,
                    child_window_id : '' + ( new Date().getTime() ) + '-' + ( ++ self.child_window_counter ),
                } );
                name = JSON.stringify( options.child_call_parameters );
            }
            catch ( error ) {
                log_error( error );
            }
            
            if ( child_window ) {
                if ( child_window.name != name ) {
                    child_window.name = name;
                }
                if ( child_window.location.href != url ) {
                    //child_window.location.replace( url );
                    child_window.location.href = url;
                }
            }
            else {
                child_window = window.open( url, name );
            }
            
            self.existing_window = child_window;
            
            return child_window;
        }
        
        close() {
            const
                self = this;
            
            if ( ! self.existing_window ) {
                return;
            }
            
            self.existing_window.close();
        }
    },
    
    get_search_info = () => {
        const
            site_link = document.querySelector( 'a[data-ylk="rsec:detail;slk:banner;"]' );
        
        if ( ! site_link ) {
            return null;
        }
        
        const
            hostname = new URL( site_link.href ).hostname,
            keyword = ( ( document.querySelector( 'main[id="contents"] div[id="contentsWrap"] > article > header > h1' ) || {} ).textContent || ( ( document.querySelector( 'meta[property="og:title"]' ) || {} ).content || document.title ).replace( /([(（].*?[）)])?\s*-[^\-]*$/, '' ) || '' ).trim();
            
        
        return {
            site_link,
            hostname,
            keyword,
            search_url : 'https://www.google.com/search?ie=UTF-8&q=' + encodeURIComponent( 'site:' + hostname + ' ' + keyword ),
        };
    },
    
    create_button = ( parameters ) => {
        if ( ! parameters ) {
            parameters = {};
        }
        let button = document.createElement( 'a' );
        
        button.className = SEARCH_BUTTON_CLASS;
        button.textContent = SEARCH_BUTTON_TEXT;
        button.href = parameters.url ? parameters.url : '#';
        
        if ( parameters.onclick ) {
            button.addEventListener( 'click', parameters.onclick );
        }
        
        return button;
    },
    
    check_pickup_page = () => {
        log_debug( 'check_pickup_page()' );
        
        if ( document.querySelector( '.' + SEARCH_BUTTON_CLASS ) ) {
            return true;
        }
        
        const
            readmore_link = document.querySelector( '[data-ylk^="rsec:tpc_main;slk:headline;pos:"]' );
        
        if ( ! readmore_link ) {
            return;
        }
        
        let
            child_window_control = new ChildWindowControl(),
            
            button = create_button( {
                url : readmore_link.href,
                onclick : ( event ) => {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    child_window_control.open( readmore_link.href );
                },
            } );
        
        readmore_link.after( button );
        
        return true;
    },
    
    check_article_page = () => {
        log_debug( 'check_article_page()' );
        
        if ( document.querySelector( '.' + SEARCH_BUTTON_CLASS ) ) {
            return true;
        }
        
        const
            search_info = get_search_info();
        
        log_debug( 'search_info', search_info );
        
        if ( ! search_info ) {
            return;
        }
        
        let
            child_window_control = new ChildWindowControl(),
            
            button = create_button( {
                url : search_info.search_url,
                onclick : ( event ) => {
                    event.stopPropagation();
                    event.preventDefault();
                    
                    child_window_control.open( search_info.search_url, {
                        child_call_parameters : {
                            hostname : search_info.hostname,
                            keyword : search_info.keyword,
                        },
                    } );
                },
            } );
        
        search_info.site_link.after( button );
        
        return true;
    },
    
    check_child_article_page = () => {
        log_debug( 'check_child_article_page()' );
        
        try {
            document.body.style.visibility = 'hidden';
        }
        catch ( error ) {
        }
        
        const
            search_info = get_search_info();
        
        log_debug( 'search_info', search_info );
        
        if ( ! search_info ) {
            return;
        }
        
        location.href = search_info.search_url;
        
        return true;
    },
    
    check_search_page = () => {
        log_debug( 'check_search_page()' );
        
        const
            query = ( [ ... new URL( location.href ).searchParams ].filter( param => param[ 0 ] == 'q' )[ 0 ] || [] )[ 1 ];
        
        if ( ! query ) {
            return true;
        }
        
        const
            hostname = ( query.match( /^site:([^\s]+)/ ) || [] )[ 1 ];
        
        if ( ! hostname ) {
            return true;
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
        
        if ( ! site_link ) {
            return true;
        }
        location.href = site_link.href;
    },
    
    current_url_object = new URL( location.href ),
    
    child_called_parameters = ( () => {
        if ( ! window.opener ) {
            return {};
        }
        
        let child_called_parameters = {},
            current_url = location.href;
        
        try {
            child_called_parameters = JSON.parse( window.name );
            
            if ( ( ! child_called_parameters ) || ( child_called_parameters.script_name != SCRIPT_NAME ) ) {
                return {};
            }
        }
        catch ( error ) {
            return {};
        }
        
        child_called_parameters.initial_url = current_url;
        
        return child_called_parameters;
    } )(),
    
    is_child_page = !! child_called_parameters.script_name,
    
    check_page = ( () => {
        if ( /^\/pickup\//.test( current_url_object.pathname ) ) {
            return check_pickup_page;
        }
        
        if ( /^\/articles\//.test( current_url_object.pathname ) ) {
            return is_child_page ? check_child_article_page : check_article_page;
        }
        
        if ( /(^www\.)?google\.com/.test( current_url_object.hostname ) && ( current_url_object.pathname == '/search' ) ) {
            try {
                window.name = '';
            }
            catch ( error ) {
            }
            return is_child_page ? check_search_page : null;
        }
        return null;
    } )();

if ( ! check_page ) {
    return;
}

const
    insert_css_rule = () => {
        const
            css_rule_text = `
                .${SEARCH_BUTTON_CLASS} {
                    text-align: center !important;
                    font-weight: bolder !important;
                    color: navy !important;
                    background: lightblue !important;
                }
                
                .${SEARCH_BUTTON_CLASS}:hover {
                    text-decoration: underline !important;
                }
            `;
        
        let css_style = document.querySelector( '.' + CSS_STYLE_CLASS );
        
        if ( css_style ) css_style.remove();
        
        css_style = document.createElement( 'style' );
        css_style.classList.add( CSS_STYLE_CLASS );
        css_style.textContent = css_rule_text;
        
        document.querySelector( 'head' ).appendChild( css_style );
    },
    
    observer = new MutationObserver( ( records ) => {
        let stop_request = false;
        
        try {
            stop_observe();
            stop_request = check_page();
        }
        finally {
            if ( ! stop_request ) {
                start_observe();
            }
        }
    } ),
    start_observe = () => observer.observe( document.body, { childList : true, subtree : true } ),
    stop_observe = () => observer.disconnect();

insert_css_rule();
start_observe();

} )();
