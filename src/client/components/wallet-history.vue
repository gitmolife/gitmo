<template>
	<table class="hist-table" style="border-collapse: collapse; width: 100%;">
		<thead class="hist-table-header">
			<tr style="opacity: 0.84;">
				<th style="text-align: left; padding: 1px 0px 4px 0; width: 25%;">Date and Time</th>
				<th style="text-align: left; padding: 1px 6px 4px 0; font-size: 0.92em; width: 6%;">Type</th>
				<th style="text-align: right; padding: 1px 8px 4px 22px; width: 18%;">Amount</th>
				<th style="text-align: center; padding: 1px 20px 4px 4px;">Action</th>
				<th style="text-align: center; padding: 1px 6px 4px 8px; font-size: 0.88em; width: 9%;">Audit</th>
				<th style="text-align: left; padding: 1px 2px 4px 0; font-size: 0.97em;">Transaction Id</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="table in walletHistory" :key="table[0]">
				<th style="width: 25%; text-align: left; padding: 1px 2px 2px 0; word-break: break-all; font-size: 13px;" class="monospace"><span class="_date">{{ table[3] }}</span> <span class="_time">{{ table[7] }}</span></th>
				<td style="width: 6%; padding: 1px 6px 2px 0; text-align: left;" class="monospace">{{ table[1] }}</td>
				<td v-if="table[1] === 'SYNC'" style="width: 19%; text-align: right; padding: 1px 8px 2px 22px;" class="monospace">
					<span v-html="prefixAmt(table[4],table[1])"></span><span class="strikeout" title="Change from Transfer">{{ table[4].replace('-', '').replace('~', '') }}</span>
				</td>
				<td v-else style="width: 19%; text-align: right; padding: 1px 8px 2px 22px;" class="monospace">
					<span v-html="prefixAmt(table[4],table[1])"></span>{{ table[4].replace('-', '').replace('~', '') }}
				</td>
				<td style="padding: 1px 6px 2px 8px; opacity: 0.8; text-align: center;" class="monospace">{{ table[2] }}</td>
				<td v-if="table[1] === 'TIP'" style="width: 8%; padding: 1px 6px 2px 8px; opacity: 0.77; text-align: center; font-size: 12px;" class="monospace">
					<span title="Internal Transfer"><i class="fas fa-check-circle"></i></span>
				</td>
				<td v-else style="width: 9%; padding: 1px 6px 2px 8px; opacity: 0.73; text-align: center; font-size: 12.5px;" class="monospace" title="Network Confirmations Count">
					<span :class="prefixConf(table[6])">{{ table[6] }}</span><span style="font-weight: 700; font-size: 9px;">&nbsp;/&nbsp;</span><span :class="suffixConf(table[6], confRequire)">{{ confRequire }}</span>
				</td>
				<td style="padding: 1px 0px 2px 0; font-size: 12px;" class="monospace">
					<a v-if="table[5].length === 64" @click="showDetail(table[5])" target="_blank" title="View on Explorer">{{ table[5].substr(0, 14) + '..' }}</a>
					<span v-if="table[5].length !== 64">{{ table[5] }}</span>
				</td>
			</tr>
		</tbody>
		<tfoot class="hist-table-footer">
			<tr style="opacity: 0.84;">
				<th style="text-align: left; padding: 2px 0px 0px 0; width: 25%;">Date and Time</th>
				<th style="text-align: left; padding: 2px 6px 0px 0; font-size: 0.92em; width: 6%;">Type</th>
				<th style="text-align: right; padding: 2px 8px 0px 22px; width: 18%;">Amount</th>
				<th style="text-align: center; padding: 2px 20px 0px 4px;">Action</th>
				<th style="text-align: center; padding: 2px 6px 0px 8px; font-size: 0.88em; width: 9%;">Audit</th>
				<th style="text-align: left; padding: 2px 2px 0px 0; font-size: 0.97em;">Transaction Id</th>
			</tr>
		</tfoot>
	</table>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { modalPageWindow } from '@client/os';

export default defineComponent({
	components: {

	},

	props: {
		walletHistory: {
			type: Object,
			required: true,
		},
		confRequire: {
			type: Number,
			required: true,
		},
		explorer: {
			type: String,
			required: true,
		},
	},

	data() {
		return {
		};
	},

	methods: {

		showDetail(txid: string) {
			let url = this.explorer + 'tx/' + txid;
			window.open(url, '_blank');
			//modalPageWindow('/my/wallet/explore/tx/' + txid);
		},

		prefixAmt(amount, type) {
			if (amount.indexOf('~') >= 0) {
				return '<span style="color: #ebb331;">~</span>';
			}
			let amt = parseFloat(amount);
			if (amt < 0) {
				if (type === 'SITE') {
					return '<span style="color: #8832e3;">-</span>';
				} else if (type === 'TIP') {
					return '<span style="color: #e37332;">-</span>';
				} else {
					return '<span style="color: #e34c32;">-</span>';
				}
			} else if (amt > 0) {
				if (type === 'IN+') {
					return '<span style="color: #36d9d3;">+</span>';
				} else if (type === 'TIP') {
					return '<span style="color: #32e388;">+</span>';
				} else {
					return '<span style="color: #32e34f;">+</span>';
				}
			}
		},

		prefixConf(cnf) {
			if (cnf <= 0) {
				return 'confirms-new';
			} else if (cnf <= 1) {
				return 'confirms-first';
			} else if (cnf <= 3) {
				return 'confirms-third';
			} else if (cnf <= 5) {
				return 'confirms-fifth';
			} else if (cnf <= 7) {
				return 'confirms-seventh';
			}
			return 'confirms-complete';
		},

		suffixConf(cnf, req) {
			if (cnf <= 5) {
				return 'confirms-third';
			} else if (req > 0 && cnf >= req) {
				return 'confirms-complete';
			} else if (req > 0) {
				return 'confirms-fifth';
			}
			return '';
		},
	}
});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
	font-size: 0.85em;
}

.hist-table tr {
	border-bottom: 1px dotted rgba(161, 161, 161, 0.28);
}

.hist-table tbody > tr:hover {
	background-color: rgba(164, 164, 164, 0.13);
}

.hist-table th {
	border-bottom: 1px dashed rgba(161, 161, 161, 0.30);

	._date {
		font-weight: 500;
		font-size: 11px;
		opacity: 0.88;
	}

	._time {
		font-size: 12px;
		opacity: 0.94;
	}
}

.hist-table-header th {
	border-bottom: 1px solid rgba(161, 161, 161, 0.48);
}

.hist-table-footer th {
	border-top: 1px solid rgba(161, 161, 161, 0.44);
	border-bottom: none;
}

.hist-table-footer tr {
	border-bottom: none;
}

.strikeout {
	text-decoration: line-through;
	opacity: 0.92;
}

.confirms-new {
	color: #e34c32;
}
.confirms-first {
	color: #e37332;
}
.confirms-third {
	color: #ebb331;
}
.confirms-fifth {
	color: #36d9d3;
}
.confirms-seventh {
	color: #32e388;
}
.confirms-complete {
	color: #32e34f;
}
</style>
