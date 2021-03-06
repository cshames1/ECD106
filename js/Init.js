/*
 * Copyright (c) 2018, Douglas H. Summerville, Binghamton University
 * (see license.txt for attributions)
 * Updated by 2021 [ECD106] Charlie Shames, Thomas Nicolino, Ben Picone, Joseph Luciano; Advisor: Meghana Jain
 */
window.urlParams = window.urlParams || {};
window.MAX_REQUEST_SIZE = window.MAX_REQUEST_SIZE  || 10485760;
window.MAX_AREA = window.MAX_AREA || 15000 * 15000;
window.EXPORT_URL = window.EXPORT_URL || '/export';
window.SAVE_URL = window.SAVE_URL || '/save';
window.OPEN_URL = window.OPEN_URL || '/open';
window.RESOURCES_PATH = window.RESOURCES_PATH || 'resources';
window.RESOURCE_BASE = window.RESOURCE_BASE || window.RESOURCES_PATH + '/logicdesigner';
window.STENCIL_PATH = window.STENCIL_PATH || 'stencils';
window.IMAGE_PATH = window.IMAGE_PATH || 'images';
window.STYLE_PATH = window.STYLE_PATH || 'styles';
window.CSS_PATH = window.CSS_PATH || 'styles';
window.VERILOG_PATH = window.VERILOG_PATH || 'verilog';
window.mxBasePath = window.mxBasePath || 'mxgraph';
window.mxLanguage = window.mxLanguage || urlParams['lang'];
window.mxLanguages = window.mxLanguages || ['de'];
