import { _decorator, Component, JsonAsset } from 'cc';
import { GameConfig } from '../GameUtility/GameConfig';

const { ccclass, property } = _decorator;

@ccclass( 'MainScene' )
export class MainScene extends Component
{
    // 遊戲可調整參數的 JSON 設定
    @property( { type: JsonAsset } )
    public ConfigJson: JsonAsset | null = null;

    // 在其他 Component 的 start() 前先建立 GameConfig，讓後續初始化可以直接使用合法設定
    protected onLoad(): void
    {
        if ( this.ConfigJson === null )
        {
            throw new Error( '[MainScene] 尚未設定 config.json。' );
        }

        GameConfig.GetInstance().SetConfig( this.ConfigJson );
    }
}
