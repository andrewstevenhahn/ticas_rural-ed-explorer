<?php
/**
 * Plugin Name: TICAS Rural Explorer Embed
 * Description: Registers the [ticas_rural_explorer] shortcode that embeds the Rural
 *              Completion Explorer as a full-bleed, responsive iframe. Because the
 *              markup is rendered server-side by the shortcode, it bypasses the
 *              content sanitizer (wp_kses) that strips style/class/sandbox from
 *              iframes pasted into Custom HTML blocks.
 * Version:     1.0.0
 * Author:      TICAS
 *
 * TWO WAYS TO USE THIS FILE:
 *
 *  A) As a WPCode snippet (recommended, no file access needed):
 *     Copy everything BELOW the line marked "=== WPCODE: COPY FROM HERE ===" (i.e. the
 *     function + add_shortcode call, WITHOUT the opening <?php tag and WITHOUT this header)
 *     into a new WPCode "PHP Snippet". See README.md for click-by-click steps.
 *
 *  B) As a standalone plugin:
 *     Zip this file (or the containing folder) and upload via Plugins → Add New → Upload,
 *     then activate. The whole file including this header is valid as-is.
 *
 * Then place the shortcode where the graphic should appear:
 *     [ticas_rural_explorer]
 *     [ticas_rural_explorer height="900" mobile_height="80vh"]
 * Use a "Shortcode" block (NOT a Custom HTML block — those do not run shortcodes).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// === WPCODE: COPY FROM HERE ===
function ticas_rural_explorer_shortcode( $atts ) {
	$atts = shortcode_atts(
		array(
			'height'        => '800',   // desktop height in pixels
			'mobile_height' => '85vh',  // height at <=768px (accepts px, vh, %, etc.)
			'src'           => 'https://andrewstevenhahn.github.io/ticas_rural-ed-explorer/embed.html',
		),
		$atts,
		'ticas_rural_explorer'
	);

	$height        = preg_replace( '/\D/', '', $atts['height'] );          // digits only
	$mobile_height = preg_replace( '/[^0-9a-z%\.]/i', '', $atts['mobile_height'] );
	$src           = esc_url( $atts['src'] );

	if ( '' === $height ) { $height = '800'; }
	if ( '' === $mobile_height ) { $mobile_height = '85vh'; }

	// Full-bleed breakout: the wrapper escapes its (possibly narrow) theme column and
	// spans the full viewport width. Rendered server-side, so these styles survive.
	return '<style>'
		. '.ticas-rural-fullbleed{position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw;max-width:100vw;}'
		. '.ticas-rural-fullbleed iframe{display:block;width:100%;height:' . $height . 'px;border:0;}'
		. '@media(max-width:768px){.ticas-rural-fullbleed iframe{height:' . $mobile_height . ';min-height:520px;}}'
		. '</style>'
		. '<div class="ticas-rural-fullbleed">'
		. '<iframe src="' . $src . '" title="TICAS Rural Completion Explorer" '
		. 'width="100%" height="' . $height . '" frameborder="0" allowfullscreen loading="lazy"></iframe>'
		. '</div>';
}
add_shortcode( 'ticas_rural_explorer', 'ticas_rural_explorer_shortcode' );
// === WPCODE: COPY TO HERE ===
