<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialog"
	:width="400"
	@close="dialog.close()"
	@closed="$emit('closed')"
>
	<template v-if="announcement" #header>:{{ announcement.title }}:</template>
	<template v-else #header>New announcement</template>

	<div>
		<MkSpacer :marginMin="20" :marginMax="28">
			<div class="_gaps_m">
				<MkInput v-model="title">
					<template #label>{{ i18n.ts.title }}</template>
				</MkInput>
				<MkTextarea v-model="text">
					<template #label>{{ i18n.ts.text }}</template>
				</MkTextarea>
				<MkRadios v-model="icon">
					<template #label>{{ i18n.ts.icon }}</template>
					<option value="info"><i class="ti ti-info-circle"></i></option>
					<option value="warning"><i class="ti ti-alert-triangle" style="color: var(--warn);"></i></option>
					<option value="error"><i class="ti ti-circle-x" style="color: var(--error);"></i></option>
					<option value="success"><i class="ti ti-check" style="color: var(--success);"></i></option>
				</MkRadios>
				<MkRadios v-model="display">
					<template #label>{{ i18n.ts.display }}</template>
					<option value="normal">{{ i18n.ts.normal }}</option>
					<option value="banner">{{ i18n.ts.banner }}</option>
					<option value="dialog">{{ i18n.ts.dialog }}</option>
				</MkRadios>
				<MkSwitch v-model="needConfirmationToRead">
					{{ i18n.ts._announcement.needConfirmationToRead }}
					<template #caption>{{ i18n.ts._announcement.needConfirmationToReadDescription }}</template>
				</MkSwitch>
				<MkButton v-if="announcement" danger @click="del()"><i class="ti ti-trash"></i> {{ i18n.ts.delete }}</MkButton>
			</div>
		</MkSpacer>
		<div :class="$style.footer">
			<MkButton primary rounded style="margin: 0 auto;" @click="done"><i class="ti ti-check"></i> {{ props.announcement ? i18n.ts.update : i18n.ts.create }}</MkButton>
		</div>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as Misskey from 'misskey-js';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import * as os from '@/os';
import { i18n } from '@/i18n';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkRadios from '@/components/MkRadios.vue';

const props = defineProps<{
	user: Misskey.entities.User,
	announcement?: any,
}>();

let dialog = $ref(null);
let title: string = $ref(props.announcement ? props.announcement.title : '');
let text: string = $ref(props.announcement ? props.announcement.text : '');
let icon: string = $ref(props.announcement ? props.announcement.icon : 'info');
let display: string = $ref(props.announcement ? props.announcement.display : 'dialog');
let needConfirmationToRead = $ref(props.announcement ? props.announcement.needConfirmationToRead : false);

const emit = defineEmits<{
	(ev: 'done', v: { deleted?: boolean; updated?: any; created?: any }): void,
	(ev: 'closed'): void
}>();

async function done() {
	const params = {
		title: title,
		text: text,
		icon: icon,
		imageUrl: null,
		display: display,
		needConfirmationToRead: needConfirmationToRead,
		userId: props.user.id,
	};

	if (props.announcement) {
		await os.apiWithDialog('admin/announcements/update', {
			id: props.announcement.id,
			...params,
		});

		emit('done', {
			updated: {
				id: props.announcement.id,
				...params,
			},
		});

		dialog.close();
	} else {
		const created = await os.apiWithDialog('admin/announcements/create', params);

		emit('done', {
			created: created,
		});

		dialog.close();
	}
}

async function del() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.t('removeAreYouSure', { x: title }),
	});
	if (canceled) return;

	os.api('admin/announcements/delete', {
		id: props.announcement.id,
	}).then(() => {
		emit('done', {
			deleted: true,
		});
		dialog.close();
	});
}
</script>

<style lang="scss" module>
.footer {
	position: sticky;
	bottom: 0;
	left: 0;
	padding: 12px;
	border-top: solid 0.5px var(--divider);
	-webkit-backdrop-filter: var(--blur, blur(15px));
	backdrop-filter: var(--blur, blur(15px));
}
</style>
