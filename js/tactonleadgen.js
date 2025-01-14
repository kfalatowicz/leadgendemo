/*
The MIT License

Copyright 2020 Tacton Systems AB

*/

// AUX-PROPS
// tc_map_component_to_picture = Array of images for imageoptions
// tc_total_price = The total price if not found in the BOM

var $ = jQuery;

(function(window, document, $, undefined){

    var LG = {
        currentState: "",
        resourcePath: "./",
        products: [],
        publicKey: "",
        configUrl: "",
        isVisualizationSupported: false,
        visualizationData: {},
        visualizationUrl: "",

        totalPrice: 0,
        selectedGroup: "",
        lastCommit: {},
        configData: {},
        summaryGroupName: "",
        visGroupName: "3DGroup",
        currentBom: {},
        oldBom: {},
        bomColumns: "",
        bomExtraInfo: "",
        bomShowPrices: "",
        productId: "",
        productName: "",
        needsParams: "",

        createWidget: function(p) {
            if(p.properties.hidden === "yes"){
                return;
            }

			//Allow empty description on selected image
			if(p.description == "" && p.properties.guitype != "selected_image"){
                console.log("INFO: The field '"+ p.name +"' doesn't have any description. The field will not be displayed");
                return;
            }

            if(LG.isValidId(p.name) == false) {
                console.log("INFO: The name/id for field '", p.name, "' is not valid. Change it in the model or you will risk getting errors in the configurator");
            }

            //CORRECT GUI-TYPE
            if(p.properties.guitype == "radio"){
                if(p.domain.elements.length > 5){
                    p.properties.guitype = "dropdown";
                }
            } else if(p.properties.guitype == "dropdown"){
                if(p.domain.elements.length <= 2){
                    p.properties.guitype = "radio";
                }
            }

            //WORKAROUND TO BE ABLE TO USE ONOFF-SWITCHES. IT'S NOT ALLOWED TO SET GUITYPE=ONOFF IN THE MODEL
            if (p.properties.tc_guitype === "onoff") {
                //Error-prevention for crappy modelling
                if(p.domain.elements.length == 2){
                    var e1 = p.domain.elements[0].name.toLowerCase();
                    var e2 = p.domain.elements[1].name.toLowerCase();
                    if(e1 == "yes" || e1 == "on" || e1 == "yes" || e1 == "no") {
                        if(e2 == "yes" || e2 == "on" || e2 == "yes" || e2 == "no") {
                            p.properties.guitype = "onoff";
                        }
                    }
                }
            }

            //QUESTION CONTAINER
            var padlock = "";
            if (p.properties.guitype !== "readonly" && p.properties.guitype !== "selected_image") {
                padlock = `
				<div class="new-padlock">
					<span class="icon icon-replay"></span>
					<span class="reset">Edited</span>
				</div>
				`;
            }

            var widget = $(`<div class="question-container field ${p.properties.guitype}${p.committed ? " committed" : ""}" id="${LG.generateValidId(p.name)}" data-id="${p.name}">
					<div class="q-header">
						<h4 class="fieldname">${p.description == "" ? "-" : p.description}</h4>
						${p.committed ? padlock : ""}
					</div>
				</div>
			`);

            //INFO TEXT
            //TODO: Check if it appends correctly
            if (p.properties.tc_info_text) {
                $(`<p class="infotext">${LG.getInfoText(p)}</p>`).appendTo(widget)
            }

            //SELECTED IMAGE
            if (p.properties.guitype === "selected_image") {
                let imagePath="";
                imagePath = LG.resourcePath + "products/";

                widget.append($(`<img src="${imagePath}${p.properties.tc_component_picture}" />`));

            //TEXTFIELD
            } else if (p.properties.guitype === "text" && p.properties.tc_guitype != "slider") {

                var max = p.domain.max == undefined ? "na" : p.domain.max;
                var min = p.domain.min == undefined ? "na" : p.domain.min;
                var unit; // = p.properties.tc_unit == undefined ? "" : p.properties.tc_unit;

                var input = $(`<input type="text" name="${p.name}" value="${p.valueDescription ? p.valueDescription : ""}" data-type="${p.domain.name}"></input>`);

                if(p.domain.name == "float" || p.domain.name == "int"){
                    input.prop('title', "Min: " + min + " Max: " + max);
                }

                if (p.properties.guitype === "readonly") {
                    input.prop("disabled", true);
                    input.prop("onchange", null);
                }

                var unit = LG.getUnit(p);

                //Units
                if(unit != ""){
                    var unitcontainer = $('<div class="input-group" />');
                    unitcontainer.append(input);
                    unitcontainer.append($(`<div class="input-group-addon">${unit}</div>`));
                    widget.append(unitcontainer);
                } else {
                    widget.append(input);
                }


                //RANGE SLIDER
                // https://seiyria.com/bootstrap-slider/#example-22
                // https://github.com/seiyria/bootstrap-slider
                //Check later https://gomakethings.com/check-if-two-arrays-or-objects-are-equal-with-javascript/

                // AUX-PROPS
                // tc_guitype = "slider" | Set it to use the slider
                // tc_range_min = Min value for the range-slider
                // tc_range_max = Max value for the range-slider
                // tc_range_step = Step size for the range-slider

            } else if(p.properties.guitype === "text" && p.properties.tc_guitype === "slider"){

                var max = p.domain.max == undefined ? 0 : parseInt(p.domain.max);
                var min = p.domain.min == undefined ? 0 : parseInt(p.domain.min);

                var rangeMin = parseFloat(p.properties.tc_range_min);
                var rangeMax = parseFloat(p.properties.tc_range_max);

                var template = $(`<div class="range-container">
									<input type="range" name=${p.name} value=${p.valueDescription} data-type=${p.domain.name} data-val=${p.valueDescription}>
										<div class="range-summary">
											<div class="min">${rangeMin}</div>
											<div class="result">
												<span>${p.valueDescription ? p.valueDescription : ""}</span>
												<input type="text" class="hidden" name=${p.name} value=${p.valueDescription ? p.valueDescription : ""}>
											</div>
											<div class="max">${rangeMax}</div>
										</div>
								</div>`);

                var rangeslider = $(`<input type="range" name="${p.name} data-type="${p.domain.name}">`);

                rangeslider.attr("data-val", p.valueDescription);
                rangeslider.prop('title', 'Min: '+ min + " Max: " + max);
                rangeslider.prop("value", p.valueDescription); //Needed, if not the value is not set properly

                if (p.properties.guitype === "readonly") {
                    rangeslider.prop("disabled", true);
                    rangeslider.prop("onchange", null);
                }

                var rangeHighlights = [];
                var step = p.properties.tc_range_step == undefined ? 1 : Math.ceil(parseFloat(p.properties.tc_range_step));

                if(rangeMax != max) {
                    rangeHighlights.push({ "start": max, "end": rangeMax, "class": "orange" })
                }

                if(rangeMin != min) {
                    rangeHighlights.push({ "start": rangeMin, "end": min, "class": "orange" });
                }

                template.find("input[type=range]").slider({
                    id: 'slider-'+p.name,
                    min: rangeMin,
                    max: rangeMax,
                    step: step,
                    value: p.valueDescription,
                    tootip: "show",
                    rangeHighlights: rangeHighlights
                });

                widget.append(template);

            //READONLY
            } else if (p.properties.guitype === 'readonly') {
                if(p.properties.tc_unit != undefined) {
                    widget.append($(`<span class="read-only-text">${p.value} <span class="tc-unit">${p.properties.tc_unit}</span></span>`));
                } else {
                    widget.append($(`<span class="read-only-text">${p.valueDescription}</span>`));
                }

            //IMAGE BUTTONS
            } else if (p.properties.guitype === "image_buttons" ) {

                var imageList = $("<div class=\"imagelist\"/>");
                var imgString = p.properties.tc_map_component_to_picture; //Might crach if not set?
                if(imgString == undefined) {
                    var imgObj = [];
                } else {
                    try {
                        var imgObj = JSON.parse(imgString);
                    }
                    catch(error) {
                        var imgObj =  [];
                        console.error(error);
                        console.log("Error: The json-string in aux-prop tc_map_component_to_picture is wrong in field ", p.name);
                    }
                }

				var plugin = this;
				plugin.showSpinner();
                $.each(p.domain.elements, function(index, item){
                    var imageName = "no-pic.png";
                    let imagePath="";

                    if(imgObj.length != 0){
                        var result = $.grep(imgObj, function(e){ return e.name == item.name; });
                        if(result.length) {
                            imageName = result[0].image;
                        }
                        imagePath = LG.resourcePath + "products/";
                    }
					else{
						//
						// Fix for non TC studio products that have no tc_map_component_to_picture
						// Images filenames have to match item.name and be of .PNG format
						//
                        imagePath = LG.resourcePath + "products/";
                        imageName = item.name + ".png";
                        let imageTest = location.protocol + '//' + location.host + imagePath + imageName;
						var xhr = new XMLHttpRequest();
						xhr.open('HEAD', imageTest, false);
						xhr.send();
						if (xhr.status == "404") {
                            imagePath = LG.resourcePath + "img/";
							imageName = "no-pic.png";
                        }
                    }

                    var imageOption = $(`<div class="imageoption state-${item.state} ${item.selected ? "state-selected" : ""}">
							<div class="image">
								<img src="${imagePath + imageName}" name="${p.name}" class="${item.state}" title="${item.description}" data-value="${item.name}">
							</div>
						</div>`);


                    imageList.append(imageOption);
                });
				plugin.hideSpinner();
                widget.append(imageList);

            //IMAGE-TEXT-BUTTONS
            } else if (p.properties.guitype === "imagetext_buttons") {
                var imageList = $("<div class=\"imagelist\"/>");
                var imgString = p.properties.tc_map_component_to_picture;
                if(imgString == undefined) {
                    var imgObj = [];
                } else {
                    try {
                        var imgObj = JSON.parse(imgString);
                    }
                    catch(error) {
                        var imgObj = [];
                        console.error(error);
                        console.log("Error: The json-string in aux-prop 'tc_map_component_to_picture' is wrong in field '", p.name, "'");
                    }
                }

				var plugin = this;
				plugin.showSpinner();
                $.each(p.domain.elements, function(index, item){
                    var imageName = "no-pic.png";
                    let imagePath="";

                    if(imgObj.length != 0) {
                        var result = $.grep(imgObj, function(e){ return e.name == item.name; });
                        if(result.length) {
                            imageName = result[0].image;
                        }
                        imagePath = LG.resourcePath + "products/";
                    }
					else{
						//
						// Fix for non TC studio products that have no tc_map_component_to_picture
						// Images filenames have to match item.name and be of .PNG format
						//
                        imagePath = LG.resourcePath + "products/";
                        imageName = item.name + ".png";
                        let imageTest = location.protocol + '//' + location.host + imagePath + imageName;
                        var xhr = new XMLHttpRequest();
                        xhr.open('HEAD', imageTest, false);
                        xhr.send();
                        if (xhr.status == "404") {
                            imagePath = LG.resourcePath + "img/";
                            imageName = "no-pic.png";
                        }
                    }

                    var imageOption = $(`
						<div class="imageoption state-${item.state} ${item.selected ? " state-selected" : ""}">
							<div class="image">
								<img src="${imagePath + imageName}" class="${item.state}" name="${p.name}" data-value="${item.name}">
							</div>					
							<div class='c-inputs-stacked big'>
								<label class="c-input c-radio ${item.state}">
									<input type="radio" value="${item.name}" name="${p.name}" class="${item.state}" ${item.selected ? "checked": ""}>
									<span class="c-indicator ${item.state}"></span>
									<span class="label-text ${item.state}">${item.description}</span>
								</label>
							</div>
						</div>
					`);

                    imageList.append(imageOption);
                });
				plugin.hideSpinner();

                widget.append(imageList);

            //ON-OFF BUTTONS
            } else if (p.properties.guitype === "text_buttons") {
                var buttonGroup = `
					<div class="buttongroup">
						${p.domain.elements.map(item => `<button data-value="${item.name}" name="${p.name}" class="btn btn-default state-${item.state} ${item.selected ? "state-selected" : ""}">
							${item.description}
						</button>`).join('')}
					</div>`;

                widget.append($(buttonGroup));

            //ON-OFF SWITCH
            } else if (p.properties.guitype === "onoff") {

                if(p.value.toLowerCase() == "yes" || p.value.toLowerCase() == "on") {
                    var checked = "checked";
                } else {
                    var checked = "";
                }

                var state = "state-green";
                for(var i=0; i<p.domain.elements; i++) {
                    if(p.domain.elements[i].selected == false && p.domain.elements[i].state == "orange" ){
                        state = "state-orange";
                        break;
                    }
                }

                //Pretty big risk for errors
                if(p.domain.elements[0].name.toLowerCase() == "yes" || p.domain.elements[0].name.toLowerCase() == "on" ) {
                    var onVal = p.domain.elements[0].name;
                    var offVal = p.domain.elements[1].name;
                } else {
                    var onVal = p.domain.elements[1].name;
                    var offVal = p.domain.elements[0].name;
                }

                var onoff = `<label class="switch">
								<input type="checkbox" name="${p.name}" data-on="${onVal}" data-off="${offVal}" ${checked}>
								<span class="${state}"></span>
							</label>
						`;

                widget.append($(onoff));

            //RADIOBUTTON
            } else if (p.properties.guitype == "radio") {
                const radiocontainer = `<div class='c-inputs-stacked big'>
					${p.domain.elements.map(item => `
					<label class="c-input c-radio ${item.state}">
						<input type="radio" value="${item.name}" name="${p.name}" class="${item.state}" ${item.selected == true ? "checked" : ""} data-id="${p.name}">
						<span class="c-indicator ${item.state}"></span>
						<span class="label-text ${item.state}">${item.description}</span>
					</label>
					`).join('')}
				</div>`;

                widget.append($(radiocontainer));

            //DROPDOWN
            } else if (p.properties.guitype == "dropdown") {
                let selectContainer = `<select>${p.domain.elements.map(item => `
						<option value="${item.name}" ${item.selected ? "selected": ""} class="${item.state}">${item.description}</option>
					`).join('')}</select>`;
                widget.append($(selectContainer));
            }

            //Selectric - Faked selectboxes - Remove this line if you don't want them (http://selectric.js.org/)
            widget.find('select').selectric({
                disableOnMobile: false,
                nativeOnMobile: false
            });

            return widget;
        },

        conflictItemTemplate: function(change) {
            return `
			<li>
				<span class="title">${change.description}</span>
				<div class="conflict-row">
					<div class="from">${change.oldValueDescription}</div>
					<div class="arrow">
						<div class="arrow-icon">
							<span class="icon icon-long-arrow-right"></span>
						</div>
					</div>
					<div class="to">${change.newValueDescription}</div>
				</div>
			</li>
			`;
        },

        handleResponse: function(data) {
            console.log("Handle response", data);

            var response = data.response;
            var messages = $("#conflict").empty();
            if($("#errorMessage").hasClass("hidden") ==  false ){ $("#errorMessage").addClass("hidden")}

            //TODO: Take a look at what messages this could be, is it only conflict messages????
            if (response.hasOwnProperty("message")) {
                messages.append($(`<p class="message">${response.message}</p>`));
            }

            if (response.hasOwnProperty("changed")) {
                messages.append($(`<p>To resolve your selection, the following parameters must be changed</p>`));

                var list = $('<ul/>').appendTo(messages);
                response.changed.forEach(function (change) {
                    var listItem = $(LG.conflictItemTemplate(change)).appendTo(list);
                });

                //$('.modal.conflict').modal('show');
                $('.modal.conflict').addClass("zoomIn");
                $('.modal.conflict').modal({backdrop: true});
            }

            if (response.status){
                LG.drawConfigurator(data);
                LG.drawVisualization();
            }
        },

        acceptConfiguratorSuggestions: function() {
            console.log("Accept configuration suggestion");
            //$('.modal.conflict').modal('hide');
            //Hide modal
            $('.modal.conflict').addClass("zoomOut").removeClass("zoomIn");
            setTimeout( function() {
                $('.modal.conflict').modal("hide");
                $(".modal.conflict").removeClass("zoomOut");
                LG.post("accept", LG.lastCommit, LG.accept);
            }, 700);
        },

        rejectConfiguratorSuggestions: function() {
            $('.modal.conflict').addClass("zoomOut").removeClass("zoomIn");
            setTimeout( function() {
                $('.modal.conflict').modal("hide");
                $(".modal.conflict").removeClass("zoomOut");
                //LG.post("accept", LG.lastCommit, LG.accept);
            }, 700);
        },

        accept: function(data) {
            console.log("Only accept");
            $('#message').empty();
            LG.drawConfigurator(data);
        },

        createGroup: function(g, parent) {
			// Sometimes the property "properties" for a member is undefined
			if(g.properties==undefined){
			   g.properties = {};
			}		   
            //Don't render the summary group
            if(g.name === LG.summaryGroupName){
                return;
            }

            //This should replace the non-bulletproof solution below
            if(typeof g.properties !== 'undefined') {
                if (g.properties.hidden === "yes" || g.properties.hidden === "true") { //Yes, it's a string. Old modelling legacy... with a bool backup
                    return;
                }
            }

            if(g.hasVisibleParameters == false ) {
                return;
            }

            if(typeof g.properties !== 'undefined') {
                if (g.properties.tc_hidden_leadgen === "yes") {
                    return;
                }
            }

            let imagePath="";
            imagePath = LG.resourcePath + "products/";

            var groupName = g.name.replace(" ", "_");
            var groupImage = "";
            if(typeof g.properties !== 'undefined') {
                if (g.properties.tc_group_picture) {
                    if (Array.isArray(g.properties.tc_group_picture)) {
                        groupImage = `<img src="${imagePath + g.properties.tc_group_picture[0]}" alt="">`;
                    } else {

                        //
                        //for non TC Studio models that we can't set aux props and tc_group_picture has no filename extension
                        //
                        if(g.properties.tc_group_picture.slice((g.properties.tc_group_picture.lastIndexOf(".") - 1 >>> 0) + 2)!=""){
                        groupImage = `<div class="image">
									<img src="${imagePath + g.properties.tc_group_picture}" alt="">
								</div>`;
                        }
                        else{
                            groupImage = `<div class="image">
									<img src="${imagePath + g.properties.tc_group_picture}.jpg" alt="">
								</div>`;
                        }

                    }
                }
            }

            var infoText = LG.getInfoText(g);
            var group = $(`<div class="group" data-groupname=${groupName}>
								${g.description == "" ? "" : `<h3 class="group-name">${g.description}</h3>`}
								${typeof g.properties === undefined ? "" : `<p class="group-infotext">${infoText}</p>`}
								${groupImage}
								<!--<div class="fields"></div>-->
							</div>`);

            group.appendTo(parent);

            g.members.forEach(function (m) {
                if (m.isGroup) {
                    LG.createGroup(m, group);
                } else {
                    //group.find(".fields").append(LG.createWidget(m));
                    $("div[data-groupname='"+groupName+"']").append(LG.createWidget(m));
                }
            });
        },

        drawConfigurator: function(data) {
            console.log("drawConfigurator");
            console.log("DATA: ", data);

            var plugin = this;
            LG.configData = data;
            const rootGroup = LG.getObjects(data, "name", "root");

            LG.visualizationData = {"type": "parameters", "parameters": []};
            var configurator = $('#configurator').empty();
            LG.currentState = data.configState ? data.configState : LG.currentState;
            var steps = $('.steps').empty();

            LG.drawNavigator(data);
            if(LG.isVisualizationSupported){
                LG.updateVis(data);
            }

            LG.drawSummary();

            //Loops until if finds a group that is ok, then exits. Unless a group is already selected
            if(LG.selectedGroup == "") {
                $.each(rootGroup[0].members, function(index, member){
                    if(typeof member.properties === "undefined"){
                        member.properties = {};
                    }
                    if (member.properties.hidden != "yes" || member.properties.hidden != "true" || member.hasVisibleParameters == true || member.properties.tc_hidden_leadgen != "yes" ) {
                        LG.createGroup(member, $("#configurator"));
                        return false;
                    }
                });
            } else {
                LG.createGroup(LG.getObjects(rootGroup, "name", LG.selectedGroup)[0], $("#configurator"));
            }

            // SET TOTAL PRICE
            //Check out for different currencies https://exchangeratesapi.io/
            const priceArray = LG.getObjects(data, "name", "tc_total_price");

            if(priceArray.length){
                var price = priceArray[0].valueDescription;
                var currency = priceArray[0].properties.tc_lead_gen_currency == undefined ? "" : priceArray[0].properties.tc_lead_gen_currency;

                if(price == undefined){
                    $(".total-price").text("0 " + currency );
                } else if (typeof price === 'string' || price instanceof String){
                    $(".total-price").text(price + " " + currency);
                } else {
                    $(".total-price").text(String(parseInt(priceArray[0].valueDescription)) +" "+ currency);
                }
            } else {
                $(".total-price").text("0");
            }

            console.log("drawBom call")
            LG.post("bom", {}, this.drawBom);
            plugin.hideSpinner();
        },

        drawNavigator: function(data){
            var stepCounter = 1;

            data.steps.forEach(function (s, index) {
                if(s.available == false) {
                    return;
                }

                let step = $(`<li class="step ${s.current ? "selected" : ""}">
								<span class="dot">${stepCounter}</span>
								<a data-name="${s.name}">${s.description}</a>
							</li>`);

                stepCounter = stepCounter + 1;

                if (s.current) {
                    if(s.rootGroup.members) {
                        var subnav = $('<ul class="subnav" />');
                        $.each(s.rootGroup.members, function(index, member){

                            if(typeof member.properties === "undefined"){
                                member.properties = {};
                            }

                            if(member.isGroup == false) {
                                return;
                            }

                            if(member.hasVisibleParameters != true) {
                                return;
                            }

                            //Don't render the summary group
                            if(member.name == LG.summaryGroupName) {
                                return;
                            }

                            //Don't render the visualization group
                            if(member.name == LG.visGroupName){
                                return;
                            }

                            if (member.properties.hidden == "yes" || member.properties.hidden == "true") {
                                return;
                            }

                            if(member.properties.tc_hidden_leadgen == "yes"){
                                return;
                            }

                            if(member.properties.info_group == "yes"){
                                return;
                            }

                            const committedValues = LG.getObjects(member, "committed", true);

                            let substep = $(`<li class="group-step ${LG.selectedGroup == member.name ? "selected" : ""}" data-name="${member.name}">
												${committedValues.length ? `<div class="group-dot" title="Has committed values"></div>` : ""}
												<a data-name="${member.name}">${member.description}</a>
											</li>`);

                            subnav.append(substep);
                        });
                        step.append(subnav);
                    }
                }

                $(".steps").append(step);

                if(LG.selectedGroup === ""){
                    $(".steps .subnav .group-step:first-child").addClass("selected");
                }
            });
        },

        drawSummary: function(){
            console.log("drawSummary");

            if(LG.summaryGroupName == ""){
				console.log("No summary group");
				$(".summary").detach();
                return;
            }

            function pipeSignCleanup(desc){
                if(desc.slice(-1) == "|"){
                    return desc.substring(0, desc.length - 1);
                } else {
                    return desc;
                }
            }

            const summaryGroup = LG.getObjects(LG.configData, "name", LG.summaryGroupName);

            console.log("summaryGroup", summaryGroup);

            if(summaryGroup.length){
                let template = `
					<ul>
						${summaryGroup[0].members.map(member => {
                    var unit = LG.getUnit(member);
                    var description = LG.removeTextDuplicates(member.description);

                    if(description != member.description) {
                        console.log("INFO: Duplicated text - The field '", member.name, "' has duplicated description text. You probably want to check it out");
                    }

                    if(member.properties.hidden == "yes"){
                        return "";
                    } else {
                        return `<li>
									<div class="name">${description}</div>
									<div class="value">${pipeSignCleanup(member.valueDescription)} ${unit}</div>
								</li>`
                    }
                }).join("")}
					</ul>`;

                $("#summary .content .list").empty().append($(template));
                $(".modal.thankyou .list").empty().append($(template));
            }
        },

        compareBom: function(){
            function getStatus(searchObj){
                const oldBom = LG.oldBom.bom;
                const len = LG.oldBom.bom.length;
                var status = "New";

                for(let i=0; i<len; i++){
                    if(searchObj.name == oldBom[i].name) {

                        //same
                        if(JSON.stringify(searchObj) === JSON.stringify(oldBom[i]) ){
                            status = "Not changed";
                            break;
                            return status;
                        } else {
                            status = "Updated";
                            break;
                            return status;
                        }
                    }
                }
                return status;
            }

            function findRemoved(searchObj){
                const oldBom = LG.oldBom.bom;
                const newBom = LG.currentBom.bom;
                found = false;

                for(let i=0; i<newBom.length; i++) {
                    if(newBom[i].name == searchObj.name) {
                        found = true;
                        return found;
                        break;
                    }
                }
                return found;
            }

            if(LG.oldBom.bom != undefined && LG.currentBom.bom != undefined){
                var currentBom = LG.currentBom.bom;
                var oldBom = LG.oldBom.bom;
                var newArr = [];

                for(let i=0; i < currentBom.length; i++){
                    let objCopy = Object.assign({}, currentBom[i]);
                    objCopy.status = getStatus(currentBom[i]);
                    newArr.push(objCopy);
                }

                for(let i=0; i<oldBom.length; i++){
                    var found = findRemoved(oldBom[i]);
                    if(found == false) {
                        let objCopy = Object.assign({}, oldBom[i]);
                        objCopy.status = "Removed";
                        newArr.push(objCopy);
                        //console.log("BOMITEM REMOVED");
                    }
                }

                return newArr;
                console.log("Updated Bom", newArr);
            } else {
                return [];
            }
        },

        drawBom: function(data) {
            console.log("drawBom: ", data);

            if(data.status != "OK") {
                console.error("ERROR: Something went wrong trying to get the bom ", data);
                return;
            }

            LG.oldBom = LG.currentBom;
            LG.currentBom = data;

            let statusBom = LG.compareBom();
            const newItems = LG.getObjects(statusBom, "status", "New");
            const updatedItems = LG.getObjects(statusBom, "status", "Updated");
            const removedItems = LG.getObjects(statusBom, "status", "Removed");

            $(".bom-status").empty().append($(`
				<h4>Recently updated</h4>
				<ul class="status-list">
					<li><span>New </span><span><strong>${newItems.length}</strong></span></li>
					<li><span>Updated </span><span><strong>${updatedItems.length}</strong></span></li>
					<li><span>Removed </span><span><strong>${removedItems.length}</strong></span></li>
				</ul>
			`));

            if(statusBom.length) {
                $(".bom-updates").empty().append($(`
					<h4>Updates after last commit</h4>
					<ul class="update-list">
						${statusBom.filter(item => item.status != "Not changed").map(item => `
							<li>
								<div class="name">${item.description}</div>
								<div class="status">${item.status}</div>
							</li>
						`).join('')}
					</ul>
				`));
            }

            function addItem(bomItem) {
                const a = LG.bomColumns[0].articleNumber;
                const p = LG.bomColumns[0].price;
                const artNo = bomItem.attributes[a] == undefined ? "" : bomItem.attributes[a];
                const price = bomItem.attributes[p] == undefined ? "0" : bomItem.attributes[p];

                const extraInfo = LG.bomExtraInfo;

                var subItemClass = subItemClass == undefined ? "" : subItemClass;

                const image = bomItem.attributes.tc_component_picture == undefined ? "no-pic-white.png" : bomItem.attributes.tc_component_picture;
                const longDescription = bomItem.attributes.long_description == undefined ? "" : bomItem.attributes.long_description;

                let imagePath="";
                imagePath = LG.resourcePath + "products/";

                //Top-item
                if(bomItem.subItems.length >= 1){
                    //console.log("Topitem? ", bomItem);
                    return `<li class="item-header">
								<div class="bom-row">
									<div class="col">
										<strong>${bomItem.description}</strong>
									</div>
								</div>
								<ul>
								${bomItem.subItems.map(addItem).join('')}
								</ul>
							</li>	
						`;

                } else {
                    //Subitem
                    return `<li>
						<div class="bom-row">
							<div class="col-name">
								<span>${bomItem.description}</span>
								<a class="show-details"><span class="icon icon-chevron-down"></span></a>
							</div>
							<div class="col-id ${subItemClass}"><span title=${artNo}>${artNo}</span></div>
							<div class="col-price">${price}</div>
						</div>
						<div class="col-info hidden">
							<div class="info-row">
								<div class="info">
									<div class="description">
										<strong>Description</strong><br>
										<p>${longDescription}</p>
									</div>
									<table>
									<tr><td class="name">Qty</td><td class="desc">${bomItem.qty}</td></tr>
										${extraInfo.map(item => `<tr><td class="name">${item.name}</td><td class="desc">${bomItem.attributes[item.key]}</td></tr>`).join('')}
									</table>
								</div>
								<div class="col-image">
									<div class="image">
										<img src="${imagePath}${image}" alt="">
									</div>
								</div>
							</div>
						</div>	
					</li>`;
                }
            }

            var template = $(`
			<ul class="${LG.bomShowPrices == true ? "show-prices" : "hide-prices"}">
				<li class="bom-header">
					<div class="bom-row">
						<div class="col-name">Name</div>
						<div class="col-id">Art No</div>
						<div class="col-price">Price</div>
					</div>
				</li>
				${data.bom.map(addItem).join('')}
			</ul>
			`);

            $('#bom .content .list').empty();
            $("#bom .content .list").append(template);

            LG.getTotalPrice(data);
        },

        createLead: function(e) {
            e.preventDefault();
            var plugin = this;
            var serialize = $("#leadForm").serializeArray();
            var data = {};
            serialize.forEach(function (e) {
                data[e.name] = e.value;
            });

            console.log("LEAD");
            console.log(data);

            LG.post("lead", data, function () {
                plugin.hideSpinner();
                $('.modal.requestquote').addClass("zoomOut").removeClass("zoomIn");

                setTimeout(
                    function() {
                        $('.modal.requestquote').modal("hide");
                        $('.modal.thankyou').addClass("zoomIn");
                        $('.modal.thankyou').modal({backdrop: true});
                    }, 700);
            });
        },

        startConfig: function (productId) {
            if(productId != "" && productId != undefined){
                var data = LG.needsParams;
                data["product"] = productId;
                data["_key"] =  LG.publicKey;
                data["configState"] = "";
                this.post("start", data);
                $(".main.config").addClass("configmode");
            }
        },


        drawVisualization: function(){
            if(LG.isVisualizationSupported) {
                var plugin = this;
                LG.post("visualization", {}, function (data) {
                    if (data && Object.keys(data).length > 0) {
                        var containerHTMLElement = $("#visualization .content").get(0);
                        var visObject = tactonVis(containerHTMLElement, data);
                        if(!LG.handleMessageSet) {
                            visObject.onMessage(LG.handleMessage);
                        }
                        LG.handleMessageSet = true;
                    }
                    plugin.hideSpinner();
                });
            }
        },


        stepChange: function (name) {
            var currentStep = "";
            if(LG.configData != null) {
                LG.configData.steps.forEach(function(step, index) {
                   if(step.current) {
                       currentStep = step.name;
                   }
                });
            }
            if(currentStep.startsWith("step_need")) {
                name = "next";
            }
            var data = {"step": name};
            LG.post("step", data);
        },

        commitValue: function (fieldName, fieldValue) {
            LG.totalPrice = 0;
            var data = {
                "par": fieldName,
                "val": fieldValue
            };
            LG.lastCommit = data;
            LG.post("commit", data);
        },

        uncommitValue: function (fieldName) {
            LG.totalPrice = 0;
            var data = {
                "par": fieldName
            };
            LG.post("uncommit", data);
        },

        post: function(action, data, callback) {
            var plugin = this;
            plugin.showSpinner();
            data["configState"] = LG.currentState;
            data["_key"] = LG.publicKey;

            console.log("POST")
            console.log("POST URL: " + LG.configUrl + action);
            console.log("POST DATA", data);

            $.ajax({
                type: "POST",
                url: LG.configUrl + action,
                data: data,
                success: callback ? callback : plugin.handleResponse,
                error: plugin.error
            });
        },

        //rootGroup
        updateVis: function(data) {
            function makeUpdate(member){
                if(member.isGroup == true) {
                    $.each(member.members, function(index, m){
                        makeUpdate(m);
                    });
                } else {
                    if (member.properties["tc_visualization_parameter"]) {
                        LG.visualizationData.parameters.push({name: member.name, value: member.value});
                    }
                }
            }

            let rootGroup = LG.getObjects(data, "name", "root");

            if(rootGroup.length){
                rootGroup[0].members.forEach(function(m) {
                    makeUpdate(m)
                });
            }

            if($('#vis-window').length){
                $('#vis-window')[0].contentWindow.postMessage(JSON.stringify(LG.visualizationData), '*');
            }
        },

        error: function(jqXHR, status, thrown) {
            console.log("Handle error", jqXHR);

            var messages = $('#errorMessage').empty().removeClass("hidden");

            try {
                var response = JSON.parse(jqXHR.responseText);
                message.append($('<span class="icon icon-alert-circle-o"></span>'));
                messages.append($('<span/>', {"text": response.message}));
                $(".request-btn").attr("disabled", true);
                LG.hideSpinner();
            } catch (e) {
                console.log(e);
                messages.append($('<span/>', {"text": "The configurator did not respond."}));
                $(".request-btn").attr("disabled", true);
                LG.hideSpinner();
            }
        },

        linkCleanup: function(str) {
            replace = "_";
            str = replaceAll(str,"/", replace);
            str = replaceAll(str," ", "-");

            function escapeRegExp(str) {
                return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
            }

            function replaceAll(str, find, replace) {
                return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
            }

            return str.toLowerCase();
        },

        //Loads the selectbox with valid products
        loadProductlist: function() {
            var theSelect = $("#products select");
            theSelect.empty();
            LG.products.forEach(function (p) {
                theSelect.append($('<option/>', {"value": p.ref, "text": p.name}));
            });
        },

        showSpinner: function(){
            $(".overlay").removeClass("hidden");
        },

        hideSpinner: function() {
            $(".overlay").addClass("hidden");
        },

        getObjects: function (obj, key, val) {
            var objects = [];
            for (var i in obj) {
                if (!obj.hasOwnProperty(i)) continue;
                if (typeof obj[i] == 'object') {
                    objects = objects.concat(LG.getObjects(obj[i], key, val));
                } else
                //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
                if (i == key && obj[i] == val || i == key && val == '') { //
                    objects.push(obj);
                } else if (obj[i] == val && key == ''){
                    //only add if the object is not already in the array
                    if (objects.lastIndexOf(obj) == -1){
                        objects.push(obj);
                    }
                }
            }
            return objects;
        },

        //return an array of values that match on a certain key
        getValues: function (obj, key) {
            var objects = [];
            for (var i in obj) {
                if (!obj.hasOwnProperty(i)) continue;
                if (typeof obj[i] == 'object') {
                    objects = objects.concat(LG.getValues(obj[i], key));
                } else if (i == key) {
                    objects.push(obj[i]);
                }
            }
            return objects;
        },

        //HANDLE MESSAGE SENT FROM VISUALIZATION
        handleMessage: function(message){
            if(message.data != null){
                if(message.data.action == "multicommit"){
                    var parameters = message.data.parameters;
                    if(parameters instanceof Object){
                        var key = Object.keys(parameters)[0];
                        var val = Object.values(parameters)[0];
                        LG.commitValue(key, val);
                        if(key === "conflict_message_information"){
                            if(val == ""){
                                $("#vis-conflict").text("");
                                $("#vis-conflict").addClass("hidden");
                            } else {
                                $("#vis-conflict").text(val);
                                $("#vis-conflict").removeClass("hidden");
                            }
                        }
                    }
                }
            }
            else {
                // TCLGW-12 - send configuration to visualization again.
                // Visualization should be able to request the current configuration if it’s not been sent to the visualization due to timing issues
                if($('#vis-window').length){
                    $('#vis-window')[0].contentWindow.postMessage(JSON.stringify(LG.visualizationData), '*');
                }
            }
        },

        //CHECK THAT THE NUMBER INPUT IS WITHIN LIMITS
        autoCorrectNumberInput: function(field){
            var min = field.data("min");
            var max = field.data("max");
            var d = field.data("value");
            var v = field.val();
            if(v == "") {
                return d;
            } else if (v < min) {
                return min;
            } else if(v > max) {
                return max;
            } else {
                return v;
            }
        },

        isValidEmail: function (email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        },

        getUrlParameter: function (sParam) {
            var sPageURL = window.location.search.substring(1);
            var sURLVariables = sPageURL.split('&');
            var sParameterName;

            for (var i = 0; i < sURLVariables.length; i++) {
                sParameterName = sURLVariables[i].split('=');

                if (sParameterName[0] === sParam) {
                    return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
                }
            }
        },

        //GET TOTAL PRICE FROM BOM
        getTotalPrice: function(data) {
            if(LG.bomShowPrices == false) {
                $(".total-price").parent().addClass("hidden");
                $("#overview .summary .image-and-text img").removeClass("hidden");
            }

            const priceArray = LG.getObjects(data, "name", "tc_total_price");

            if(priceArray.length == 0) {
                var totalPrice = 0;

                //Check that a price column exist
                if(LG.bomColumns[0].price.length == 0){
                    return 0;
                }

                let priceArray = LG.getValues(data, LG.bomColumns[0].price);

                if(priceArray.length) {
                    try {
                        const totPrice = priceArray.reduce((accumulator, currentValue) => parseFloat(accumulator) + parseFloat(currentValue));
                        console.log("Total price: ", String(Math.round(totPrice)) );
                        $(".total-price").text(String(Math.round(totPrice)) + " €");
                    } catch(error) {
                        console.error("BOM price info contain errors:" , error);
                    }
                } else {
                    $(".total-price").text("0");
                }
            }
        },

        isValidId: function(id) {
            re = /^[A-Za-z]+[\w\-\:\.]*$/
            return re.test(id)
        },

        generateValidId: function(str) {
            //Because there is no check of the names in TCStudio. Sometimes the names get's crappy and needs a check, will not follow HTML/CSS standards otherwise
            if(LG.isValidId(str) == false){
                str = str.replace(/ /g,"_"); 		//replace spaces
                str = str.replace(/["'()#]/g,"_"); 	//replace misc characters
                str = str.replace("__","_");		//replace double underscores
            }
            return str;
        },

        getUnit: function(member) {
            //When using multiple models, the aux-props and the output sometime gets duplicated (bug?)
            if (member.properties.tc_unit == undefined) {
                var unit = "";
            } else if (Array.isArray(member.properties.tc_unit)) {
                var unit = member.properties.tc_unit[0];
                console.log("INFO: Your model has double tc_unit aux-props in the field '", member.name, "'. You probably want to check it out");
            } else {
                var unit = member.properties.tc_unit;
            }

            //Cleanup of some unwanted brackets
            unit = unit.replace("[", "");
            unit = unit.replace("]", "");

            return unit;
        },

        getInfoText: function(member) {
            //When using multiple models, the aux-props and the output sometime gets duplicated
            if(typeof member.properties !== 'undefined') {
                if (member.properties.tc_info_text == undefined) {
                    infoText = "";
                } else if (Array.isArray(member.properties.tc_info_text)) {
                    infoText = member.properties.tc_info_text[0];
                    console.log("INFO: Your model has double 'tc_info_text' aux-props for element '", member.name, "'. You probably want to check it out");
                } else {
                    infoText = member.properties.tc_info_text;
                }
            }
            else{
                infoText = "";
            }

            return infoText;
        },

        removeTextDuplicates: function(str) {
            //For some reason the api sometimes return description text duplicated. This function removes the duplicates

            var l = str.length;
            if(l >= 4){
                if(l % 2 == 0) {
                    if( str.substring(0, (l/2) ) == str.substring((l/2) , l ) ) {
                        return str.substring(0, (l/2) );
                    }
                }
            }
            return str;
        }
    }

    window.LG = LG;

})(window, document, jQuery);


window.addEventListener("message", event => LG.handleMessage(event), false); // function(event){LG.handleMessage(event);}


//jQuery(function($) {
$(document).ready(function () {

    console.log("Document ready");

    var config_vars = {
        "config": {
            "api_key": "LEADGEN_API_KEY",
            "config_url": "https://CPQ_INSTANCE_URL/!tickets~T-00000001/configurator-api/"
        },
        "product":{
            "product_name": "Product Name",
            "product_id": "m34324cf3b9442e38a9d9db9897286fa",
            "is_visualization_supported": "0",
            "visualization_image": "",
            "visualization_group_name": "",
            "summary_group_name": "info",
            "bom_columns": "[{\"articleNumber\": \"artNo\", \"price\": \"localListPrice\"}]",
            "bom_extra_info": "[{\"name\":\"Article no\", \"key\": \"artNo\"}]",
            "bom_show_prices": "0",
            "needs_params" : "{}"
        }
    };

    var c = config_vars.config;
    var p = config_vars.product;

    LG.productName = p.product_name;
    LG.productId = p.product_id;

    //API-Key
    if(c.api_key != undefined && c.api_key != "") {
        LG.publicKey = c.api_key;
    }
    //Config Url
    if(c.config_url != undefined && c.config_url != "") {
        LG.configUrl = c.config_url;
    }
    //BOM Columns
    if(p.bom_columns != undefined && p.bom_columns != "") {
        LG.bomColumns = JSON.parse(p.bom_columns);
    }
    //BOM Extra info
    if(p.bom_extra_info != undefined && p.bom_extra_info != "") {
        LG.bomExtraInfo = JSON.parse(p.bom_extra_info);
    }
    //BOM Show Prices
    if(p.bom_show_prices != undefined && p.bom_show_prices != "") {
        LG.bomShowPrices = p.bom_show_prices == "1" ? true : false;
    }
    //Is Visualization Supported
    if(p.is_visualization_supported != undefined && p.is_visualization_supported != "") {
        LG.isVisualizationSupported = p.is_visualization_supported == "1" ? true : false;
    }
    //Visualization Group Name
    if(p.visualization_group_name != undefined && p.visualization_group_name != "") {
        LG.visGroupName = p.visualization_group_name;
    }
    //Summary Group Name
    if(p.summary_group_name != undefined && p.summary_group_name != "") {
        LG.summaryGroupName = p.summary_group_name;
    }

	//Needs parameters
	if(p.needs_params != undefined && p.needs_params != "") {
		LG.needsParams = JSON.parse(p.needs_params);
	}

    //Set product name
    $(".product-name").text(LG.productName.toUpperCase());

    $("#productOfInterest").val( LG.productName);

    console.log("Document ready - start config")

    LG.startConfig(LG.productId);

    if (!LG.isVisualizationSupported) {
        $('#vis-window').addClass('hidden');
    }

    //RADIOBUTTON CLICK
    $(".config").on( "click","input[type=radio]" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).attr("value");
        var checked = ($(this).prop("checked", true) == true ? true : false);
        LG.commitValue(name, value);
    });

    //SELECT CHANGE
    $("#configurator").on( "change","select" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).find('option:selected').val();
        LG.commitValue(name, value);
    });

    //INPUT TEXT
    $(".config").on( "change","input[type=text]" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).val();
        LG.commitValue(name, value);
    });

    //IMAGE TEXT BUTTONS image_buttons
    $(".config").on( "click",".imagetext_buttons .image" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).find("img").data("value");
        LG.commitValue(name, value);
    });

    //IMAGE BUTTONS image_buttons
    $(".config").on( "click",".image_buttons .image" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).find("img").data("value");
        LG.commitValue(name, value);
    });

    //ON-OFF-BUTTONS
    $(".config").on( "click",".buttongroup .btn" , function() {
        var name = $(this).closest(".question-container").data("id");
        var value = $(this).data("value");
        console.log("onoff: " + name + " " + value);
        LG.commitValue(name, value);
    });


    //SWITCH
    $(".config").on( "change",".onoff .switch input[type=checkbox]" , function() {
        var name = $(this).closest(".question-container").data("id");

        if($(this).is(":checked")){
            var value = $(this).data("on")
        }
        else{
            var value = $(this).data("off");
        }

        LG.commitValue(name, value);
    });


    //NAV STEP-CHANGE
    $(".config").on( "click", ".steps .step a", function() {
        var stepname = $(this).data("name");
        if( !$(this).closest(".step").hasClass("selected") ){
            LG.selectedGroup = "";
            LG.stepChange(stepname);
        }
    });

    //NAV - GROUPS-CHANGE
    $(".config").on( "click", ".subnav .group-step a", function() {
        var name = $(this).data("name");

        if(name != undefined && name != "") {
            LG.selectedGroup = name;
            let selector = ".group[data-name='"+name+"']";
            var el = $(selector);
            el.removeClass("hidden");
            let selectedGroup = LG.getObjects(LG.configData, "name", name);
            $("#configurator").empty();
            LG.createGroup(selectedGroup[0], $("#configurator"));
            $(".group-step").removeClass("selected");
            $(this).closest(".group-step").addClass("selected");
        }
    });

    //PADLOCKS
    $(".config").on( "click", ".new-padlock", function() {
        var questionContainer = $(this).closest(".question-container");
        var name = questionContainer.data("id");

        if(questionContainer.hasClass("text")){ //textfield
            var val = questionContainer.find("input[type='text']").val();
        } else if (questionContainer.hasClass("dropdown")) {
            var val = questionContainer.find('select option:selected').val();
        } else if (questionContainer.hasClass("radio")) {
            var val = questionContainer.find('input[name='+name+']:checked').val();
        } else if (questionContainer.hasClass("image_buttons")) {
            var val = questionContainer.find(".imageoption.state-selected img").data("value");
        } else if (questionContainer.hasClass("imagetext_buttons")) {
            var val = questionContainer.find(".imageoption.state-selected img").data("value");
        } else if (questionContainer.hasClass("text_buttons")) {
            var val = questionContainer.find(".btn.state-selected").data("value");
        }

        LG.uncommitValue(name, val);
    });

    //CONFLICT - ACCEPT SUGGESTION BUTTON
    $("#tc").on( "click", ".conflict-accept", function() {
        LG.acceptConfiguratorSuggestions();
    });

    //CONFLICT - ACCEPT SUGGESTION BUTTON
    $("#tc").on( "click", ".conflict-reject", function() {
        LG.rejectConfiguratorSuggestions();
    });

    // SHOW/HIDE BOM
    $("#tc").on( "click", ".bom", function() {
        if($("#summary .content.open").length){
            $("#summary .content").slideToggle(400, function(){
                $("#summary .content").toggleClass("open");
                $("#overview .summary").toggleClass("open");
                $("#bom .content").slideToggle(400, function(){
                    $("#bom .content").toggleClass("open");
                    $("#overview .bom").toggleClass("open");
                });
            });
        } else {
            $("#bom .content").slideToggle(400, function(){
                $("#bom .content").toggleClass("open");
                $("#overview .bom").toggleClass("open");
            });
        }
    });

    // SHOW/HIDE SUMMARY
    $("#tc").on( "click", ".summary", function() {
        if($("#bom .content.open").length){
            $("#bom .content").slideToggle(400, function(){
                $("#bom .content").toggleClass("open");
                $("#overview .bom").toggleClass("open");
                $("#summary .content").slideToggle(400, function(){
                    $("#summary .content").toggleClass("open");
                    $("#overview .summary").toggleClass("open");
                });
            });
        } else {
            $("#summary .content").slideToggle(400, function(){
                $("#summary .content").toggleClass("open");
                $("#overview .summary").toggleClass("open");
            });
        }
    });

    // SLIDER - COMMIT
    $(".config").on( "slideStop","input[type=range]" , function(e) {
        var name = $(this).attr("name");
        var value = e.value;
        $(e.target).closest(".range-container").find(".result").text(e.target.value);
        $("input[type=slider]").slider("destroy");
        LG.commitValue(name, value);
    });

    //ADJUST RANGE SLIDER
    $(".config").on( "input","input[type=range]" , function(e) {
        const rc = $(this).closest(".range-container").find(".result");
        rc.find("span").text($(this).val());
        rc.find("input").val($(this).val());
    });

    //RANGE: CLICK TO TOGGLE FIELDS
    $(".config").on("click", ".range-container span" , function(e) {
        $(this).closest(".range-container").find(".result span").addClass("hidden");
        $(this).closest(".range-container").find(".result input").removeClass("hidden");
    });

    //RANGE: LEAVE FIELD - HIDE FIELD AND SHOW SPAN WITH VALUE
    $(".config").on("focusout", ".range-container input[type=text]" , function(e) {
        $(this).closest(".range-container").find(".result span").removeClass("hidden");
        $(this).closest(".range-container").find(".result input").addClass("hidden");
    });

    //SUBMIT THE LEAD
    $("#leadForm .send button").click(function(e){
        const fields = ["company", "firstName", "lastName", "contactEmail"];
        var hasErrors = false;

        $.each(fields, function(index, field){
            let theField = $(`#leadForm input[name=${field}]`);

            if(theField.val() == "") {
                console.log("Empty field");
                theField.addClass("error");
                hasErrors = true;
            } else {
                theField.removeClass("error");
            }

            if(field == "contactEmail"){
                if(LG.isValidEmail(theField.val()) == false){
                    theField.addClass("error");
                    hasErrors = true;
                } else {
                    $(e.target).removeClass("error");
                }
            }
        });

        if(hasErrors == false) {
            LG.createLead(event);
        }
    });

    //CHECK INPUT IN REQUEST FORM
    $("#leadForm input").focusout(function(e) {
        //console.log("You left the field", e.target);
        function isEmail(email) {
            var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            return regex.test(email);
        }

        if(e.target.name == "contactName" || e.target.name == "company" || e.target.name == "addressCountry" || e.target.name == "contactEmail") {
            if(e.target.value == ""){
                console.log("empty field ", e.target.name);
                $(e.target).addClass("error");
            } else {
                $(e.target).removeClass("error");
            }
        }

        if(e.target.name == "contactEmail"){
            if(LG.isValidEmail(e.target.value) == false){
                $(e.target).addClass("error");
            } else {
                $(e.target).removeClass("error");
            }
        }
    });

    //BOM - TOGGLE DETAILS
    $(".config").on("click", "#bom .show-details" , function(e) {
        $(this).closest("li").find(".col-info").slideToggle(400);
    });


    $(".config").on("click", ".request-btn" , function(e) {
        $('.modal.requestquote').addClass(animInClass);
        $('.modal.requestquote').modal({backdrop: true});
    });

    //THANKYOU MODAL - CLOSE AND START NEW CONFIGURATION
    $("#tc").on("click", ".start-new-configuration" , function(e) {
        $('.modal.thankyou').addClass("zoomOut").removeClass("zoomIn");

        setTimeout(
            function() {
                $('.modal.thankyou').modal("hide");
                location.reload();
            }, 700);
    });

    var animInClass = "zoomIn";
    var animOutClass = "zoomOut";

    $(".config").on("click", '[data-toggle-anim=modal]' , function(e) { //Replace data-toggle=modal with data-toggle-anim=modal
        const selector = $(e.target).data("target");
        $(selector).addClass("zoomIn");
        $(selector).modal({backdrop: true});
    });

    let modals = $(".modal");
    $.each(modals, function(index, modal) {
        $(modal).on('show.bs.modal', function () {
            var closeModalBtns = $(modal).find('button[data-custom-dismiss="modal"]');
            closeModalBtns.one('click', function() {
                $(modal).on('webkitAnimationEnd oanimationend msAnimationEnd animationend', function( evt ) {
                    //console.log("Run the first function");
                    $(modal).modal('hide')
                });
                $(modal).removeClass(animInClass).addClass(animOutClass);
            })
        });

        $(modal).on('hidden.bs.modal', function ( evt ) {
            //console.log("Run the second function");
            var closeModalBtns = $(modal).find('button[data-custom-dismiss="modal"]');
            $(modal).removeClass(animOutClass);
            $(modal).off('webkitAnimationEnd oanimationend msAnimationEnd animationend');
            closeModalBtns.off('click');
        });
    });
});


//LEET :-D


//HI BUDDY - IF YOU HAVE COME THIS FAR, YOU PROBABLY WANT TO CHECK OUT THE REST OF TACTONS PRODUCTS. www.tacton.com