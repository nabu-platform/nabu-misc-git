Vue.view("environment-config", {
	props: {
		workspace: {
			type: String
		},
		project: {
			type: String
		},
		branch: {
			type: String
		}
	},
	data: function() {
		return {
			merge: null,
			changedOnly: true,
			selected: null,
			changedParamOnly: true,
			entrySearch: null,
			parameterSearch: null
		}
	},
	activate: function(done) {
		this.loadMerge().then(done, done);
	},
	computed: {
		visibleEntries: function() {
			if (this.merge.entries) {
				var self = this;
				var entries = this.merge.entries.filter(function(entry) {
					var show = true;
					if (self.changedOnly && !entry.changed) {
						show = false;
					}
					if (self.entrySearch) {
						if (entry.entryId.toLowerCase().indexOf(self.entrySearch) < 0) {
							if (entry.tags) {
								if (entry.tags.filter(function(x) {
											return x.toLowerCase().indexOf(self.entrySearch) >= 0;
										}).length == 0) {
									show = false;
								}
							}
							else {
								show = false;
							}
						}
					}
					return show;
				});
				entries.sort(function(a, b) {
					return a.entryId.localeCompare(b.entryId);	
				});
				return entries;
			}
			else {
				return [];
			}
		},
		visibleParameters: function() {
			var self = this;
			if (this.selected && this.selected.parameters) {
				var parameters = this.selected.parameters.filter(function(x) {
					var show = true;
					if (self.changedParamOnly && !x.changed) {
						show = false;
					}
					if (x.hide) {
						if (self.isCondition(x.hide)) {
							show = false;
						}
					}
					if (x.show) {
						if (!self.isCondition(x.show)) {
							show = false;
						}
					}
					if (self.parameterSearch) {
						if (x.name.toLowerCase().indexOf(self.parameterSearch) < 0) {
							show = false;
						}
					}
					return show;
				});
				return parameters;
			}
			else {
				return [];
			}
		},
		categories: function() {
			var hasUncategorized = false;
			var categories = [];
			this.visibleParameters.forEach(function(x) {
				if (x.category == null) {
					hasUncategorized = true;
				}
				else if (categories.indexOf(x.category) < 0) {
					categories.push(x.category);
				}
			});
			if (hasUncategorized) {
				categories.push("Other");
			}
			return categories;
		}
	},
	methods: {
		isCondition: function(condition) {
			if (!condition) {
				return true;
			}
			try {
				var parent = this;
				var runItInScope = function() {
					var contains = function(list, value) {
						if (!list || !list.length) {
							return false;
						}
						if (!(list instanceof Array)) {
							// we assume a string
							if (list.split) {
								list = list.split(/[\s]*,[\s]*/);
							}
							// not an array...
							else {
								return false;
							}
						}
						return list.filter(function(x) { return x == value }).length > 0;
					};
					// we want to expand the parameters into a temporary "this" scope so they can be accessed by name
					if (parent.selected && parent.selected.parameters) {
						var self = this;
						parent.selected.parameters.forEach(function(x) {
							self[x.name] = x.current;
						});
					}
					var result = eval(condition);
					return !!result;
				}
				return runItInScope();
			}
			catch (exception) {
				console.error("Could not evaluate condition", condition, exception);
				return false;
			}
		},
		getEvents: function() {
			var result = {};
			result.configurationUpdated = {properties:{}};
			return result;
		},
		loadMerge: function() {
			var self = this;
			try {
				return this.$services.swagger.execute("nabu.misc.git.manage.builds.merge.get", {
					branch: this.branch,
					workspace: this.workspace,
					project: this.project
				}).then(function(result) {
					Vue.set(self, "merge", result);
				});
			}
			catch (exception) {
				return this.$services.q.reject(exception);
			}
		},
		saveMerge: function() {
			var self = this;
			if (self.merge) {
				var promise = this.$services.swagger.execute("nabu.misc.git.manage.builds.merge.set", {
					branch: this.branch,
					workspace: this.workspace,
					project: this.project,
					body: self.merge
				});
				promise.then(function() {
					self.$emit("configurationUpdated", {});
					self.$emit("close");
				});
				self.$wait({promise:promise})
				return promise;
			}
		},
		parametersForCategory: function(category) {
			return this.visibleParameters.filter(function(x) {
				return (category == "Other" && x.category == null)
					|| category == x.category;
			});
		},
		paramLabel: function(parameter) {
			if (parameter.title) {
				return parameter.title;
			}
			var pretty = parameter.name
				.replace(/\//g, " ")
				.replace(/([A-Z]+)/g, " $1");
			var parts = pretty.split(" ");
			for (var i = 0; i < parts.length; i++) {
				parts[i] = parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
			}
			return parts.join(" ");
		},
		values: function(parameter) {
			var values = ""
			if (parameter.raw) {
				values += "<div><span class='value-key'>Current raw value:</span> " + parameter.raw + "</div>";
			}
			if (parameter.previous) {
				values += "<div><span class='value-key'>Previous environment value:</span> " + parameter.previous + "</div>";
			}
			return values;
		},
		addSimpleParameter: function(parameter) {
			var clone = JSON.parse(JSON.stringify(parameter));
			clone.raw = null;
			clone.current = null;
			var previousIndex = parseInt(parameter.name.replace(/.*\[([0-9]+)\]$/, "$1"));
			clone.name = clone.name.replace(/(.*)\[[0-9]+\]$/, "$1[" + (previousIndex + 1) + "]");
			// we must have a selected and it must have parameters for this method to be even called, no need to check
			var insertIndex = this.selected.parameters.indexOf(parameter) + 1;
			if (insertIndex >= this.selected.parameters.length) {
				this.selected.parameters.push(clone);
			}
			else {
				this.selected.parameters.splice(insertIndex, 0, clone);
			}
		},
		isSimpleArray: function(parameter) {
			var isArray = parameter.name.substring(parameter.name.length - 1) == "]";
			var lastMatch = null;
			// it must be the last in the array
			if (isArray) {
				var maxIndex = -1;
				var toMatch = parameter.name.replace(/(.*)\[[0-9]+\]$/, "$1");
				this.selected.parameters.forEach(function(x) {
					var potential = x.name.replace(/(.*)\[[0-9]+\]$/, "$1");
					console.log("checking potential", potential);
					if (potential == toMatch) {
						var index = parseInt(parameter.name.replace(/.*\[([0-9]+)\]$/, "$1"));
						console.log("found match", index);
						if (index >= maxIndex) {
							maxIndex = index;
							lastMatch = x.name;
						}
					}
				});
			}
			return isArray && lastMatch == parameter.name;
		}
	}
});