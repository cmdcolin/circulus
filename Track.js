define([
        "dojo/_base/declare","dojox/gfx",
        "dojo/_base/lang","dojo/Stateful",
        "dojo/on"
],function(
        declare,gfx,
        lang,Stateful,
        on
){
	return declare([Stateful], {
		internalRadius: 100,
		trackWidth: .1,
		foregroundColor: null,
		backgroundColor: null,
		fill: "",
		background: {
			fill: "",
			stroke: "",
		},
		stroke: "",
		data: null,
		visible: true,
		alignBackgroundToReferenceTrack: true,
		constructor: function(viewer,options,data){
			this._foregroundColorPaths=[]
			this._backgroundPaths = [];
			// console.log("Create Track: ", options)

			if (options) {
				for (var prop in options) {
					// console.log("Mixin in", prop);
					this[prop] = options[prop];
				}
			}
			this.viewer = viewer;
			this.surface = options.surface;

			this.data=data || [];

			var _self=this;

			this.watch("visible", function(attr,oldVal,vis){
				if (vis){
					_self.render();
				}else{
					options.surface.clear();
					this._foregroundColorPaths=[];
					this._backgroundPaths=[];
				}
			})

			this.watch('data', lang.hitch(this, function(attr,oldVal,data){
				//no idea why this is needed to avoid losing reference to the this.surface group from the viewer

				// console.log("Track set('data'): ",_self.surface.groupIdx, " opts groupIdx: ", options.surface.groupIdx)
				_self.surface = options.surface;
				if (this.visible){
					_self.render();
				}
			}))

			this.watch("foregroundColor", function(attr,oldVal,c){
				_self.applyForegroundColor(c)
			})

			this.watch("backgroundColor", function(attr,oldVal,c){
				_self.applyBackgroundColor(c)
			})

			this.centerPoint = viewer.get("centerPoint");

			// if (!this.surface){
			// 	this.surface = viewer.get("surface");
			// }

			if (this.visible){
				this.render();
			}
		},

		formatPopupContent: function(item){
			return item.name;
		},

		formatDialogContent: function(item){
			return JSON.stringify(item);
		},

		applyForegroundColor: function(color){
			this.fill=color;

			this._foregroundColorPaths.forEach(function(p){
				p.setFill(color);
			},this)
		},
		applyBackgroundColor: function(color){
			if (!this.background || (typeof this.background=='string')) { 
				this.background = {fill: color} 
			}else{
				this.background.fill = color;
			}

			this._backgroundPaths.forEach(function(p){
				p.setFill(color);
			},this)
		},

		_trackWidthGetter: function(){
			// console.log("_getTrackWidthAttr internal tw:", this.trackWidth, " from Viewer: ",this.viewer.getTrackWidth(this.trackWidth))
			return this.viewer.getTrackWidth(this.trackWidth)
		},

		render: function(){
			this.renderBackground();
		},

		renderAlignedBackground: function(){

			var refSections = this.referenceTrack.get('sections');

			Object.keys(refSections).forEach(function(secName){
					// if (ds.length>20){ return; };
					// console.log("Adding ",ds.length, " Data Items to Section", secName);
					// console.log("   Starting Angle: ", refSections[secName].startAngle, refSections[secName].endAngle);
					this.renderAlignedBackgroundSection(refSections[secName].startAngle, refSections[secName].endAngle, refSections[secName].length);
			},this)
		},

		renderAlignedBackgroundSection: function(startAngle,endAngle,sectionLength){
			var totalLength = 0;
			var trackWidth = this.get("trackWidth");
			// console.log("Render Aligned Background Section: ", startAngle, endAngle);
			var path = this.surface.createPath("");
			if (this.background){
				path.setStroke(this.background.stroke);
			}
			var startRads = startAngle *Math.PI/180;
			var rads = endAngle *Math.PI/180;
			// console.log(d.name, " : ", "Start: ", d.startAngle, "end: ", d.endAngle)
			var innerStart= {
				x:  this.centerPoint.x + this.internalRadius * Math.cos(startRads),
				y: this.centerPoint.y + this.internalRadius * Math.sin(startRads)
			}

			var outerStart = {
				x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(startRads),
				y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(startRads)
			}

			var outerEnd = {
				x: this.centerPoint.x + (this.internalRadius + trackWidth) * Math.cos(rads),
				y: this.centerPoint.y + (this.internalRadius + trackWidth) * Math.sin(rads)
			}
			var innerEnd = {
				x: this.centerPoint.x + (this.internalRadius) * Math.cos(rads),
				y: this.centerPoint.y  + (this.internalRadius) * Math.sin(rads) 
			}
			// var fillSel = index % 3;
			var outerRadius = this.internalRadius + trackWidth;
			var innerRadius = this.internalRadius
			var large=false
			if ((endAngle-startAngle)>=180){
				large=true
			}

			path.moveTo(innerStart)
				.arcTo(innerRadius,innerRadius,endAngle,large,true,innerEnd.x,innerEnd.y)
				.lineTo(outerEnd)
				.arcTo(outerRadius,outerRadius,startAngle,large,false,outerStart.x,outerStart.y)
				.closePath()

			if (this.background && this.background.fill){
				if (typeof this.background.fill == "function") {
					path.setFill(this.background.fill(score,index))
				}else{
					path.setFill(this.background.fill)
				}
			}
			this._backgroundPaths.push(path);
		},
		renderBackground: function(refresh){
			var trackWidth = this.get("trackWidth");
			if (this.referenceTrack && this.alignBackgroundToReferenceTrack){
				return this.renderAlignedBackground();
			}

			if (!refresh && this._backgroundRendered){ return; }
			console.log("RENDER BACKGROUND: ", trackWidth);
			// console.log("Render Backgroup surface ID: ", this.surface.groupIdx);
			this.bgPath= this.surface.createPath("");
			var r = this.internalRadius+trackWidth;
			var start = {x: this.centerPoint.x, y: this.centerPoint.y - r};
			var end   = {x: this.centerPoint.x, y: this.centerPoint.y + r};
			this.bgPath.moveTo(start).arcTo(r, r, 0, true, true, end).arcTo(r, r, 0, true, true, start).closePath();

			var r = this.internalRadius;
			var start = {x: this.centerPoint.x, y: this.centerPoint.y - r};
			var end   = {x: this.centerPoint.x, y: this.centerPoint.y + r};
			this.bgPath.moveTo(start).arcTo(r, r, 0, true, true, end).arcTo(r, r, 0, true, true, start).closePath();

			if (this.background) {
				if (this.background.fill) {
					this.bgPath.setFill(this.background.fill)
				}

				if (this.background.stroke) {		
					this.bgPath.setStroke(this.background.stroke);
				}
			}

			this._backgroundPaths.push(this.bgPath);
			this._backgroundRendered=true;
			return this.bgPath;
		}
	});
});

