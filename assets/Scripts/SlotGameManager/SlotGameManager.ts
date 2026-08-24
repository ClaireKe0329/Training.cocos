import { _decorator, Component } from 'cc';
import { SlotProcessor } from './SlotProcessor';

const { ccclass, property } = _decorator;

@ccclass( 'SlotGameManager' )
export class SlotGameManager extends Component
{
    // 負責單一 Round 流程的 SlotProcessor
    @property( { type: SlotProcessor } )
    public SlotProcessor: SlotProcessor | null = null;

    // 目前是否正在處理單一 Round
    public get IsRoundRunning(): boolean
    {
        return this.SlotProcessor?.IsRoundRunning ?? false;
    }

    // 目前 Round 是否可以要求 Skip
    public get CanSkipRound(): boolean
    {
        return this.SlotProcessor?.CanSkipRound ?? false;
    }

    // 啟動單一 Round
    public StartRound(): boolean
    {
        if ( !this.SlotProcessor )
        {
            return false;
        }

        return this.SlotProcessor.StartRound();
    }

    // 將玩家的 Skip 操作交給目前 Round
    public SkipRound(): boolean
    {
        if ( !this.SlotProcessor )
        {
            return false;
        }

        return this.SlotProcessor.SkipRound();
    }
}
