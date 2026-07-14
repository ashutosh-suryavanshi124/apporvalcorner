sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function(Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) {
    "use strict";
    return Controller.extend("approvalcorner.controller.Main", {
        onInit: function() {
            var sUser = sessionStorage.getItem("rnow_user");
            var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("MainView").attachPatternMatched(this._onRouteMatched, this);
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

            this.getView().setModel(new JSONModel({
                reviewer: "",
                reason: ""
            }), "reassign");

            this._loadAllData();
            this.byId("newTable").clearSelection();
        },

        _onRouteMatched:function(){
            this._clearSelections();
        },

        _clearSelections: function () {
            var sKey = this.getView().getModel("main").getProperty("/selectedKey");
            var mTables = {
                "New": "newTable",
                "InProgress": "inProgressTable",
                "Closed": "closedTable"
            };
            var oTable = this.byId(mTables[sKey]);
            if (oTable) {
                oTable.clearSelection();
            }
        },

        _loadAllData: function () {
            this.getView().setBusy(true);
            this._pendingReads = 3;
            var sUser = sessionStorage.getItem("rnow_user");
            var aUserFilters = [ new Filter("EUSER", FilterOperator.EQ, sUser)];
            this._readData("RNOW_NEWSet", "New", aUserFilters);
            this._readData("RNOW_INPROGRESSSet", "InProgress", aUserFilters);
            this._readData("RNOW_CLOSEDSet", "Closed", aUserFilters);
        },

        _readData: function(sEntitySet, sKey, aFilters, oTable) {
            var oModel = this.getOwnerComponent().getModel(),
                oMain = this.getView().getModel("main");

            oModel.read("/" + sEntitySet, {
                filters: aFilters || [],
                success: function(oData) {
                    var aResults = oData.results || [];
                    oMain.setProperty("/" + sKey, aResults);
                    oMain.setProperty("/" + sKey + "Count", aResults.length);
                    
                    if (oTable) {
                        oTable.setBusy(false);
                        MessageToast.show(sKey + " data refreshed.");
                    } else {
                        this._onReadFinished();
                    }
                }.bind(this),
                error: function() {
                    if (oTable) {
                        oTable.setBusy(false);
                    } else {
                        this._onReadFinished();
                    }
                    MessageToast.show("Unable to load " + sKey + " data.");
                }.bind(this)
            });
        },

        _onReadFinished: function() {
            this._pendingReads--;
            if (this._pendingReads === 0) {
                this.getView().setBusy(false);
            }
        },

        onTabSelect: function(oEvent) {
            this.getView().getModel("main").setProperty("/selectedKey", oEvent.getParameter("key"));
        },

        onNewRefresh: function() {
            this.byId("newTable").clearSelection();
            var sUser = sessionStorage.getItem("rnow_user");
            this.byId("newTable").setBusy(true);
            this._readData(
                "RNOW_NEWSet",
                "New",
                [
                    new Filter("EUSER", FilterOperator.EQ, sUser)
                ],
                this.byId("newTable")
            );
        },

        onToggleFilter: function () {
            var oSearch = this.byId("searchFilter");
            oSearch.setVisible(!oSearch.getVisible());
            if (oSearch.getVisible()) {
                oSearch.focus();
            }
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") ||
                        oEvent.getParameter("query");
            var oTable = this.byId("newTable");
            var oBinding = oTable.getBinding("rows");
            if (!sValue) {
                oBinding.filter([]);
                return;
            }
            var oFilter = new sap.ui.model.Filter({
                filters: [
                    new Filter("JOB_ID", FilterOperator.Contains, sValue),
                    new Filter("EUSER", FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
            oBinding.filter([oFilter]);
        },

        onRowSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource(),
                iRowIndex = oEvent.getParameter("rowIndex"),
                bSelected = oEvent.getParameter("rowContext") &&
                            oTable.isIndexSelected(iRowIndex);
            if (!bSelected) {
                return;
            }
            var aSelected = oTable.getSelectedIndices();
            if (aSelected.length > 1) {
                oTable.clearSelection();
                oTable.addSelectionInterval(iRowIndex, iRowIndex);
            }
        },

        onInProgressRefresh: function() {
            this.byId("inProgressTable").clearSelection();
            this.byId("inProgressTable").setBusy(true);
            this._readData(
                "RNOW_INPROGRESSSet",
                "InProgress",
                [],
                this.byId("inProgressTable")
            );
        },

        onClosedRefresh: function() {
            this.byId("closedTable").clearSelection();
            this.byId("closedTable").setBusy(true);
            this._readData(
                "RNOW_CLOSEDSet",
                "Closed",
                [],
                this.byId("closedTable")
            );
        },

        onReview: function() {
            var sKey = this.getView().getModel("main").getProperty("/selectedKey");
            var mTables = {
                "New": "newTable",
                "InProgress": "inProgressTable",
                "Closed": "closedTable"
            };
            var oTable = this.byId(mTables[sKey]);
            var aIndices = oTable.getSelectedIndices();
            if (aIndices.length !== 1) {
                MessageToast.show("Please select a record.");
                return;
            }

            var oData = oTable.getContextByIndex(aIndices[0]).getObject();
            this.getOwnerComponent().getRouter().navTo("ReviewView", {
                    user: encodeURIComponent(oData.EUSER),
                    jobId: encodeURIComponent(oData.JOB_ID),
                    connector: encodeURIComponent(oData.CONNECTOR),
                    reviewType: encodeURIComponent(oData.REVIEW_TYPE),
                    fullName: encodeURIComponent((oData.FIRSTNAME || "") +" " +(oData.LASTNAME || ""))
                });
        },

        onReassign: function () {
            var sKey = this.getView().getModel("main").getProperty("/selectedKey");
            var mTables = {
                New: "newTable",
                InProgress: "inProgressTable",
                Closed: "closedTable"
            };
            var oTable = this.byId(mTables[sKey]),
                aIndices = oTable.getSelectedIndices();
            if (aIndices.length !== 1) {
                MessageToast.show("Please select record to reassign.");
                return;
            }
            this._oSelectedApproval = oTable.getContextByIndex(aIndices[0]).getObject();

            this._resetReassignModel();
            if (!this._oReassignDialog) {
                this._oReassignDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "approvalcorner.view.fragments.ReassignDialog",
                    this
                );
                this.getView().addDependent(this._oReassignDialog);
            }
            this._oReassignDialog.open();
        },

        onReassignConfirm: function() {
            var oData = this.getView().getModel("reassign").getData(),
                oApproval = this._oSelectedApproval,
                oModel = this.getOwnerComponent().getModel();
            if (!oData.reviewer || !oData.reviewer.trim()) {
                MessageBox.error("Reviewer Name is mandatory.");
                return;
            }
            if (!oData.reason || !oData.reason.trim()) {
                MessageBox.error("Reason / Comments is mandatory.");
                return;
            }
            this._oReassignDialog.setBusy(true);
            oModel.create("/RNOW_Approval_ReassignSet", {
                EUSER: oApproval.EUSER,
                JobId: oApproval.JOB_ID,
                Reviewer1: oData.reviewer,
                Comments: oData.reason
            }, {
                success: function() {
                    this._oReassignDialog.setBusy(false);
                    MessageToast.show("Request reassigned successfully.");
                    this._resetReassignModel();
                    this._oReassignDialog.close();
                    this.onNewRefresh();
                }.bind(this),

                error: function() {
                    this._oReassignDialog.setBusy(false);
                    MessageBox.error("Unable to reassign.");
                }.bind(this)
            });
        },

        onReassignCancel: function() {
            this._resetReassignModel();
            this._oReassignDialog.close();

        },

        _resetReassignModel: function() {
            this.getView().getModel("reassign").setData({
                reviewer: "",
                reason: ""
            });
        },

        onLogout: function() {
            MessageBox.confirm("Are you sure you want to logout?", {
                actions: [
                    MessageBox.Action.OK,
                    MessageBox.Action.CANCEL
                ],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function(sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                    sessionStorage.clear();
                    this.getOwnerComponent().setModel(null);
                    this.getOwnerComponent().getRouter().navTo("LoginView", {}, true);
                }.bind(this)
            });
        }

    });
});