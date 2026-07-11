sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, MessageBox, MessageToast) {
    "use strict";
    return Controller.extend("approvalcorner.controller.Main", {
        onInit: function () {
            var sUser = sessionStorage.getItem("rnow_user");
            var oMainModel = new JSONModel({
                pageTitle: sUser ? "Approval Corner for " + sUser : "Approval Corner",
                selectedKey: "New",
                New: [],
                InProgress: [],
                Closed: [],
                NewCount: 0,
                InProgressCount: 0,
                ClosedCount: 0
            });
            this.getView().setModel(oMainModel, "main");
            this._loadAllData();
        },
        _loadAllData: function () {
    var oModel = this.getOwnerComponent().getModel(),
        oMain = this.getView().getModel("main"),
        sGroupId = "approvalBatch";
    this.getView().setBusy(true);
    oModel.setDeferredGroups([sGroupId]);
    oModel.read("/RNOW_NEWSet", {
        groupId: sGroupId,
        success: function (oData) {
            oMain.setProperty("/New", oData.results || []);
            oMain.setProperty("/NewCount", (oData.results || []).length);
        }
    });
    oModel.read("/RNOW_INPROGRESSSet", {
        groupId: sGroupId,
        success: function (oData) {
            oMain.setProperty("/InProgress", oData.results || []);
            oMain.setProperty("/InProgressCount", (oData.results || []).length);
        }
    });
    oModel.read("/RNOW_CLOSEDSet", {
        groupId: sGroupId,
        success: function (oData) {
            oMain.setProperty("/Closed", oData.results || []);
            oMain.setProperty("/ClosedCount", (oData.results || []).length);
        }
    });
    oModel.submitChanges({
        groupId: sGroupId,
        success: function () {
            this.getView().setBusy(false);
        }.bind(this),
        error: function () {
            this.getView().setBusy(false);
            MessageToast.show("Unable to load approval data.");
        }.bind(this)
    });
},
        onTabSelect: function (oEvent) {
            this.getView().getModel("main").setProperty("/selectedKey", oEvent.getParameter("key"));
        },
        onLogout: function () {
            MessageBox.confirm("Are you sure you want to logout?", {
                actions: [
                    MessageBox.Action.OK,
                    MessageBox.Action.CANCEL
                ],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    sessionStorage.clear();
                    this.getOwnerComponent().setModel(null);
                    this.getOwnerComponent()
                        .getRouter()
                        .navTo("LoginView", {}, true);
                }.bind(this)
            });
        }
    });
});