sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";
    return Controller.extend("approvalcorner.controller.Review", {

        onInit: function() {
            this.getOwnerComponent().getRouter().getRoute("ReviewView").attachPatternMatched(this._onRouteMatched, this);
            this._aSavedItems = [];
            var oUsageModel = new JSONModel({
                title: "",
                Items: []
            });
            this.getView().setModel(oUsageModel, "usage");
        },

        _onRouteMatched: function(oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this._sUser = decodeURIComponent(oArgs.user);
            this._sJobId = decodeURIComponent(oArgs.jobId);
            this._sConnector = decodeURIComponent(oArgs.connector);
            this._sReviewType = decodeURIComponent(oArgs.reviewType);
            this._sFullName = decodeURIComponent(oArgs.fullName);
            
            var oReviewModel = new JSONModel({
                pageTitle: this._sReviewType +
                    " Review of : " +
                    this._sUser +
                    " (" +
                    this._sFullName +
                    ") (" + "Job ID # " + this._sJobId + ")",
                Items: []
            });
            this.getView().setModel(oReviewModel, "review");
            this._loadReviewData();
        },

        onRefresh: function() {
            this._loadReviewData();
        },

        _loadReviewData: function() {
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setBusy(true);
            oModel.read("/RNOW_ReviewDetailSet", {
               filters: [
                    new Filter("EUser", FilterOperator.EQ, this._sUser),
                    new Filter("JobId", FilterOperator.EQ, this._sJobId),
                    new Filter("Connector", FilterOperator.EQ, this._sConnector)
                ],
                success: function(oData) {
                    var aData = oData.results || [];
                    this.getView().getModel("review").setProperty("/Items", aData);
                    this.getView().setBusy(false);
                }.bind(this),
                error: function() {
                    this.getView().setBusy(false);
                    MessageToast.show("Unable to load review details.");
                }.bind(this)
            });
        },

        onSave: function () {
            if (!this._validateReview()) {
                return;
            }
            var aItems = this.getView().getModel("review").getProperty("/Items");
            this._aSavedItems = JSON.parse(JSON.stringify(aItems));
            MessageToast.show("Changes saved locally.");
        },

        onSubmit: function () {
            if (!this._validateReview()) {
                return;
            }
            var aItems = this.getView().getModel("review").getProperty("/Items");
            MessageBox.confirm("Submit review to backend?", {
                actions: [
                    MessageBox.Action.OK,
                    MessageBox.Action.CANCEL
                ],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) {
                        return;
                    }
                }.bind(this)
            });
        },

        onCancel: function() {
            this.getOwnerComponent().getRouter().navTo("MainView", {}, true);
        },

        onUtilizedPress: function (oEvent) {
            var oRole = oEvent.getSource().getBindingContext("review").getObject();
            this._oSelectedRole = oRole;
            if (!this._oUsageDialog) {
                this._oUsageDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "approvalcorner.view.fragments.UsageAnalysisDialog",
                    this
                );
                this.getView().addDependent(this._oUsageDialog);
            }
            this.getView().getModel("usage").setProperty(
                "/title",
                "Usage Analysis of: " + oRole.Role
            );
            this._loadUsageData(oRole);
            this._oUsageDialog.open();
        },

       _loadUsageData: function (oRole) {
            var oModel = this.getOwnerComponent().getModel();
            var aFilters = [
                new Filter("Rfcdest", FilterOperator.EQ, this._sConnector),
                new Filter("EUSER", FilterOperator.EQ, this._sUser),
                new Filter("JOB_ID", FilterOperator.EQ, this._sJobId),
                new Filter("AgrName", FilterOperator.EQ, oRole.Role)
            ];

            oModel.read("/utilized_TcodesSet", {
                filters: aFilters,
                success: function (oData) {

                var aItems = oData.results || [];
                aItems.forEach(function (oItem) {
                    oItem.Highlight = oItem.CriticalTcode === "YES" ? "Error" : "None";
                });
                this.getView().getModel("usage").setProperty("/Items", aItems);
            }.bind(this),
                error: function (oError) {
                    MessageToast.show("Unable to load usage analysis.");
                    console.error(oError);
                }
            });
        },

        onActionChange: function(oEvent) {
            var oContext = oEvent.getSource().getBindingContext("review"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sAction = oEvent.getSource().getSelectedKey(),
                sComment = oModel.getProperty(sPath + "/Comment");
            oModel.setProperty(sPath + "/Action", sAction);
            oModel.setProperty(sPath + "/_changed", true);
            if (!sComment || !sComment.trim()) {
                oModel.setProperty(sPath + "/CommentState", "Error");
            } else {
                oModel.setProperty(sPath + "/CommentState", "None");
            }
        },

        onCommentChange: function(oEvent) {
            var oContext = oEvent.getSource().getBindingContext("review"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sValue = oEvent.getParameter("value");
            oModel.setProperty(sPath + "/Comment", sValue);
            oModel.setProperty(sPath + "/_changed", true);
            if (sValue && sValue.trim()) {
                oModel.setProperty(sPath + "/CommentState", "None");
            } else {
                oModel.setProperty(sPath + "/CommentState", "Error");
            }
        },

        _validateReview: function() {
            var oModel = this.getView().getModel("review"),
                aItems = oModel.getProperty("/Items"),
                bValid = true;
            aItems.forEach(function(oItem, i) {
                if (oItem._changed && (!oItem.Comment || !oItem.Comment.trim())) {
                    oModel.setProperty("/Items/" + i + "/CommentState", "Error");
                    bValid = false;
                }
            });
            if (!bValid) {
                MessageBox.error("Comment is mandatory for all modified rows.");
            }
            return bValid;
        },

        onRetain: function() {
            var aItems = this.byId("reviewTable")
                .getSelectedItems();
            aItems.forEach(function(oItem) {
                oItem.getBindingContext("review").getObject().ActionDesc = "Retain";
            });
            this.getView().getModel("review").refresh(true);
        },

        onUsageDialogClose: function() {
            this._oUsageDialog.close();
        }
        
    });
});