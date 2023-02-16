<template id="environment-config">
	<div class="environment-config">
		<div class="merge-actions">
			<button class="secondary" @click="$emit('close')">Cancel</button>
			<button class="primary" @click="saveMerge">Build</button>
		</div>
		<n-form class="environment-config-content">
			<div class="merge-entries" v-if="merge.entries">
				<h2>Entries<span class="tag">{{project}}</span><span class="tag">{{branch}}</span></h2>
				<div class="entries-filters">
					<n-form-text v-model="entrySearch" placeholder="Search"/>
					<n-form-checkbox v-model="changedOnly" label="Show only changed"/>
				</div>
				<div class="merge-entry" v-for="entry in visibleEntries" @click="selected = entry" :class="{'selected': selected == entry }">
					<span class="entry-id">{{entry.entryId}}</span>
				</div>
				<div v-if="visibleEntries.length == 0">No entries match your filter</div>
			</div>
			<div v-else>Nothing to merge</div>
			<div class="merge-parameters" v-if="selected && selected.parameters">
				<h2>Parameters<span class="tag">{{selected.entryId}}</span></h2>
				<div class="entries-filters">
					<n-form-text v-model="parameterSearch" placeholder="Search"/>
					<n-form-checkbox v-model="changedParamOnly" label="Show only changed"/>
				</div>
				<n-collapsible :title="category" v-for="category in categories">
					<div class="merge-parameter" v-for="parameter in parametersForCategory(category)">
						<n-form-combo v-model="parameter.current" v-if="parameter.enumeration != null && parameter.enumeration.length > 0" :items="parameter.enumeration"
							:label="paramLabel(parameter)" :after="parameter.description"
							:info="values(parameter)"/>
						<n-form-switch v-else-if="parameter.type == 'boolean'" :value="parameter.current == 'true' || (parameter.current == null && parameter.defaultValue == 'true')" @input="function(value) { $window.Vue.set(parameter, 'current', value ? 'true' : 'false') }"
							:label="paramLabel(parameter)" :after="parameter.description"
							:info="values(parameter)"/>
						<n-form-text v-else-if="parameter.type == 'password'" v-model="parameter.current" :label="paramLabel(parameter)"
							:after="parameter.description"
							:info="values(parameter)"
							:placeholder="parameter.defaultValue"
							type="password"/>
						<n-form-text v-else v-model="parameter.current" :label="paramLabel(parameter)"
							:after="parameter.description"
							:info="values(parameter)"
							:placeholder="parameter.defaultValue"/>
						<button v-if="isSimpleArray(parameter)" @click="addSimpleParameter(parameter)">Add value to list</button>
						<div class="buttons">
							<button class="reset-button inline" @click="parameter.current = parameter.previous" title="Reset to previous"><span class="fa fa-undo"></span></button>
							<button class="reset-button inline" @click="parameter.current = parameter.raw" title="Reset to raw"><span class="fa fa-times"></span></button>
						</div>
					</div>
				</n-collapsible>
				<div v-if="visibleParameters.length == 0">No parameters match your filter</div>
				<div class="merge-log" v-if="selected.log">
					<h2>Merge Log</h2>
					<div v-html="selected.log"></div>
				</div>
				<div class="merge-error" v-if="selected.errorLog">
					<h2>Error Log</h2>
					<pre>{{selected.errorLog}}</pre>
				</div>
			</div>
		</n-form>
	</div>
</template>