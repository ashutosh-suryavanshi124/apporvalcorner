sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, ODataModel, MessageToast, MessageBox) {
    "use strict";
    var SERVICE_URL = "/sap/opu/odata/TNOW/RNOW_ODATA_SERVICES_SRV/";
    return Controller.extend("approvalcorner.controller.Login", {
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("LoginView").attachPatternMatched(this._onRouteMatched, this);
            this._restoreSession();
        },

        _onRouteMatched: function () {
            this.byId("loginUser").setValue("");
            this.byId("loginPass").setValue("");
        },

        onLogin: function () {
            var sUser = this.byId("loginUser").getValue().trim(),
                sPassword = this.byId("loginPass").getValue();
            if (!sUser || !sPassword) {
                MessageToast.show("Please enter both username and password.");
                return;
            }
            var sAuth = "Basic " + btoa(sUser + ":" + sPassword);
            this.getView().setBusy(true);

            var oModel = this._createODataModel(sAuth);
            oModel.metadataLoaded().then(function () {
                this.getView().setBusy(false);
                this._saveSession(sUser, sAuth);
                this.getOwnerComponent().getRouter().navTo("MainView", {}, true);
            }.bind(this)).catch(function () {
                this.getView().setBusy(false);
                MessageBox.error("Invalid username or password.");
            }.bind(this));
        },

        _saveSession: function (sUser, sAuth) {
            sessionStorage.setItem("rnow_user", sUser);
            sessionStorage.setItem("rnow_auth", sAuth);
        },

        _restoreSession: function () {
            var sUser = sessionStorage.getItem("rnow_user"),
                sAuth = sessionStorage.getItem("rnow_auth");
            if (!sUser || !sAuth) {
                return;
            }
            this._createODataModel(sAuth);
            this.getOwnerComponent().getRouter().navTo("MainView", {}, true);
        },

        _createODataModel: function (sAuth) {
            var oModel = new ODataModel({
                serviceUrl: SERVICE_URL,
                useBatch: true,
                defaultBindingMode: "TwoWay",
                defaultCountMode: "Inline",
                headers: {
                    Authorization: sAuth
                }
            });
            this.getOwnerComponent().setModel(oModel);
            return oModel;
        }

    });
});