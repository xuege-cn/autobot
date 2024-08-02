const listenersRemoved = require("./listeners-removed");
const vModel = require("./v-model");
const vRef = require("./v-ref");
const vOnNativeModifierRemoved = require("./v-on-native-modifier-removed");
const transferScriptToCompositionApi = require("./transfer-script-to-composition-api");
const slotsUnification = require("./slots-unification");
const elDatePickerAttrUpdate = require("./el-date-picker-attr-update");

module.exports = [
  vModel,
  vRef,
  listenersRemoved,
  vOnNativeModifierRemoved,
  elDatePickerAttrUpdate,
  slotsUnification,
  transferScriptToCompositionApi,
];
