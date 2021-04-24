<template>
		<div style="margin-top: 7px; margin-bottom: 30px;">
			<MkContainer :foldable="true" class="_gap">
				<template #header><i class="fas fa-tachometer-alt"></i> Wallet Explorer - OHM</template>


				<div class="_content">
					<div class="_keyValue"><b>TxID</b><span class="monospace" style="font-size: 1.07em;">{{ tx.txid }}</span></div>
				</div>
				<div class="_content">
					<div class="_keyValue"><b>Blockhash</b><span class="monospace" style="font-size: 1.07em;">{{ tx.blockhash }}</span></div>
				</div>

			</MkContainer>
		</div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import parseAcct from '@/misc/acct/parse';
import MkContainer from '@client/components/ui/container.vue';
import MkFolder from '@client/components/ui/folder.vue';
import Progress from '@client/scripts/loading';
import { query as urlQuery } from '../../../prelude/url';
import { acct as getAcct } from '../../filters/user';
import * as symbols from '@client/symbols';
import * as os from '@client/os';

export default defineComponent({
	components: {
		MkContainer, MkFolder,
	},

	props: {
		txid: {
			type: String,
			required: false
		},
	},

	data() {
		return {
			[symbols.PAGE_INFO]: {
				title: 'CryptoExplorer',
			},
			tx: {
				txid: "",
				blockhash: "",
			},
			url: "http://explorer.ohm.sqdmc.net/",
			resp_message: "",
		};
	},

	created() {
		this.fetch();
	},

	methods: {
		getAcct,

		fetch() {
			this.getTx(this.txid);
		},

		async getTx(txid: string) {
      //const res = await fetch(this.url + 'api/getrawtransaction?txid=' + txid + '&decrypt=1', { mode: 'no-cors', method: 'GET' });
      //console.log(await res.json());
    }

	}

});
</script>

<style lang="scss" scoped>

.monospace {
	font-family: Lucida Console, Courier, monospace;
}
.resp-message {
	font-family: Lucida Console, Courier, monospace;
	font-style: italic;
	font-size: 15px;
}
.address-texts {
	text-shadow: -1px 2px 7px rgba(21, 29, 33, 0.88);
	font-style: underline;
	opacity: 0.88;
}

.rowEntry {
	border-bottom: 1px solid rgba(161, 161, 161, 0.08);
	padding-left: 10px;
	padding-right: 10px;
	padding-top: 8px;
	padding-bottom: 2px;
}
.rowMain {
	border-bottom: 1px solid rgba(161, 161, 161, 0.22);
	padding-top: 13px;
	padding-bottom: 5px;
}


.explore-info {
	margin-bottom: 10px;
	overflow: hidden;

	> .divbar {
		border-top: 1px solid rgba(161, 161, 161, 0.20);
		padding-top: 3px;
	}

	> dl {
		display: flex;
		margin: 0;
		line-height: 1.15em;
		margin-top: 4px;
		margin-bottom: 8px;

		> dt {
				width: 30%;
				margin: 0;
		}

		> dd {
			width: 70%;
			margin: 0;
		}

		> dd {
			font-size: 0.87em;

			> a {
				font-style: italic;
				opacity: 0.80;
			}

			> ul {
				margin: 0;
			}
		}
	}
}

</style>
