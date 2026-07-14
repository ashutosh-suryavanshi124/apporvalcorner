sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("approvalcorner.controller.Review", {

        onInit: function () {
            this.getOwnerComponent().getRouter()
                .getRoute("ReviewView")
                .attachPatternMatched(this._onRouteMatched, this);

            var oUsageModel = new JSONModel({
                title: "",
                Items: []
            });

            this.getView().setModel(oUsageModel, "usage");
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this._sUser = decodeURIComponent(oArgs.user);
            this._sJobId = decodeURIComponent(oArgs.jobId);
            this._sConnector = decodeURIComponent(oArgs.connector);
            this._sReviewType = decodeURIComponent(oArgs.reviewType);
            this._sFullName = decodeURIComponent(oArgs.fullName);

            var oReviewModel = new JSONModel({
                pageTitle:
                    this._sReviewType +
                    " Review of: " +
                    this._sUser +
                    " (" +
                    this._sFullName +
                    ") - Job ID #" +
                    this._sJobId,
                Items: []
            });

            this.getView().setModel(oReviewModel, "review");
            this._loadReviewData();
        },

        onRefresh: function () {
           this._loadReviewData(true);
        },

      _loadReviewData: function (bShowToast) {
            var oModel = this.getOwnerComponent().getModel();
            this.getView().setBusy(true);
            oModel.read("/RNOW_ReviewDetailSet", {
                filters: [
                    new Filter("EUser", FilterOperator.EQ, this._sUser),
                    new Filter("JobId", FilterOperator.EQ, this._sJobId),
                    new Filter("Connector", FilterOperator.EQ, this._sConnector)
                ],
                success: function (oData) {
                    this.getView().getModel("review").setProperty("/Items", oData.results || []);
                    this.byId("reviewTable").clearSelection();
                    this.getView().setBusy(false);
                    if (bShowToast) {
                        setTimeout(function () {
                            MessageToast.show("Review data refreshed successfully.");
                        }, 100);
                    }
                }.bind(this),
                error: function () {
                    this.getView().setBusy(false);
                    MessageToast.show("Unable to load review details.");
                }.bind(this)
            });
        },

        onToggleFilter: function () {
            var oSearch = this.byId("reviewFilter");
            oSearch.setVisible(!oSearch.getVisible());
            if (oSearch.getVisible()) {
                oSearch.focus();
            }
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") ||
                        oEvent.getParameter("query");
            var oTable = this.byId("reviewTable");
            var oBinding = oTable.getBinding("rows");
            if (!sValue) {
                oBinding.filter([]);
                return;
            }
            var oFilter = new Filter({
                filters: [
                    new Filter("Role", FilterOperator.Contains, sValue),
                    new Filter("RoleDesc", FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oBinding.filter([oFilter]);
        },

        onSave: function () {
            
        },

        onSubmit: function () {
            
        },

        onCancel: function () {
            this.getOwnerComponent().getRouter().navTo("MainView", {}, true);
        },

        onRetain: function () {
            this._updateSelectedRows("RT");
        },

        onRemove: function () {
            this._updateSelectedRows("RM");
        },

        _updateSelectedRows: function (sAction) {

            var oTable = this.byId("reviewTable"),
                oModel = this.getView().getModel("review"),
                aSelectedIndices = oTable.getSelectedIndices();
            if (aSelectedIndices.length === 0) {
                MessageToast.show("Please select at least one record.");
                return;
            }
            aSelectedIndices.forEach(function (iIndex) {
                var sPath = oTable.getContextByIndex(iIndex).getPath();
                oModel.setProperty(sPath + "/Action", sAction);
                this._validateCommentForRow(oModel, sPath);
            }.bind(this));
        },

        onActionChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("review"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sAction = oEvent.getSource().getSelectedKey();
            oModel.setProperty(sPath + "/Action", sAction);
            this._validateCommentForRow(oModel, sPath);
        },

        onCommentChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("review"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sValue = oEvent.getParameter("newValue");
            oModel.setProperty(sPath + "/Comment", sValue);
            this._validateCommentForRow(oModel, sPath);
        },

        _validateCommentForRow: function (oModel, sPath) {
            var sComment = oModel.getProperty(sPath + "/Comment");
            if (sComment && sComment.trim()) {
                oModel.setProperty(sPath + "/CommentState", "None");
            } else {
                oModel.setProperty(sPath + "/CommentState", "Error");
            }
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
            this._oUsageDialog.setBusy(true);
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
                    this._oUsageDialog.setBusy(false);
                }.bind(this),
                error: function (oError) {
                    this._oUsageDialog.setBusy(false);
                    MessageToast.show("Unable to load usage analysis.");
                }.bind(this)
            });
        },

        onUsageActionChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("usage"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sAction = oEvent.getSource().getSelectedKey();
            oModel.setProperty(sPath + "/Action", sAction);
            this._validateUsageComment(oModel, sPath);
        },

        onUsageCommentChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("usage"),
                oModel = oContext.getModel(),
                sPath = oContext.getPath(),
                sValue = oEvent.getParameter("value");
            oModel.setProperty(sPath + "/comments", sValue);
            this._validateUsageComment(oModel, sPath);
        },

        _validateUsageComment: function (oModel, sPath) {
            var sAction = oModel.getProperty(sPath + "/Action");
            var sComment = oModel.getProperty(sPath + "/comments");
            if (sAction && sAction.trim()) {
                if (!sComment || !sComment.trim()) {
                    oModel.setProperty(sPath + "/CommentState", "Error");
                } else {
                    oModel.setProperty(sPath + "/CommentState", "None");
                }
            } else {
                // No action selected -> no validation
                oModel.setProperty(sPath + "/CommentState", "None");
            }
        },

        onUsageDialogClose: function () {
            this._oUsageDialog.close();
        },

        onUsageCompleteSave: function () {
            var oUsageModel = this.getView().getModel("usage");
            var aItems = oUsageModel.getProperty("/Items");
            var oModel = this.getOwnerComponent().getModel();

            for (var i = 0; i < aItems.length; i++) {
                this._validateUsageComment(oUsageModel, "/Items/" + i);
                if (oUsageModel.getProperty("/Items/" + i + "/CommentState") === "Error") {
                    MessageToast.show("Please enter comments for all selected actions.");
                    return;
                }
            }

            this._oUsageDialog.setBusy(true);
            var iPending = aItems.length;
            var bError = false;
            aItems.forEach(function (oItem) {
                var oPayload = Object.assign({}, oItem);
                delete oPayload.Highlight;
                delete oPayload.CommentState;

                var sPath =
                    "/utilized_TcodesSet(" +
                    "LOGINUSER='" + encodeURIComponent(oItem.LOGINUSER) + "'," +
                    "CONNECTOR='" + encodeURIComponent(oItem.CONNECTOR) + "'," +
                    "JOB_ID='" + encodeURIComponent(oItem.JOB_ID) + "'," +
                    "EUSER='" + encodeURIComponent(oItem.EUSER) + "'," +
                    "Rfcdest='" + encodeURIComponent(oItem.Rfcdest) + "'," +
                    "Bname='" + encodeURIComponent(oItem.Bname) + "'," +
                    "JobId='" + encodeURIComponent(oItem.JobId) + "'," +
                    "AgrName='" + encodeURIComponent(oItem.AgrName) + "'," +
                    "Tcode='" + encodeURIComponent(oItem.Tcode) + "'" +
                    ")";

                oModel.update(sPath, oPayload, {
                    success: function () {
                        iPending--;
                        if (iPending === 0 && !bError) {
                            this._oUsageDialog.setBusy(false);
                            this._oUsageDialog.close();
                            MessageToast.show("Usage details updated successfully.");
                        }
                    }.bind(this),
                    error: function () {
                        if (!bError) {
                            bError = true;
                            this._oUsageDialog.setBusy(false);
                            MessageToast.show("Failed to update usage details.");
                        }
                    }.bind(this)
                });
            }.bind(this));

        }

    });
});